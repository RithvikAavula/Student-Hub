import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { AuthUser, Profile } from '@/types';

const AuthContext = createContext<{
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  logout: () => Promise<void>;
}>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuthStore();
  const initialized = useRef(false);

  useEffect(() => {
    // Only run once
    if (initialized.current) return;
    initialized.current = true;

    // Check if we have persisted user data - use it immediately
    const state = useAuthStore.getState();
    if (state.user && state.profile) {
      console.log('[Auth] Using persisted session data');
      state.setLoading(false);
      return;
    }

    // No persisted data - check Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        console.log('[Auth] No active session');
        useAuthStore.getState().setLoading(false);
        return;
      }

      // Session exists but no persisted data - load profile
      console.log('[Auth] Session found, loading profile...');
      const userId = session.user.id;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !profileData) {
        console.error('[Auth] Failed to load profile:', error?.message);
        useAuthStore.getState().setLoading(false);
        return;
      }

      // Build auth user
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email || '',
        role: profileData.role,
        avatar: undefined,
      };

      // Convert avatar_path to URL
      if (profileData.avatar_path) {
        const { data: urlData } = supabase.storage.from('profile').getPublicUrl(profileData.avatar_path);
        if (urlData?.publicUrl) {
          authUser.avatar = urlData.publicUrl;
        }
      }

      console.log('[Auth] Profile loaded:', authUser.email);
      useAuthStore.getState().login(authUser, profileData as Profile);
    });

    // Listen only for sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log(`[Auth] Event: ${event}`);
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      }
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      const s = useAuthStore.getState();
      if (s.loading) {
        console.warn('[Auth] Safety timeout - forcing load complete');
        s.setLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

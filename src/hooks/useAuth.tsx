import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
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

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username: user.user_metadata?.username || user.user_metadata?.full_name || user.email!.split('@')[0],
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading, login, logout: storeLogout, setLoading } = useAuthStore();
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    // React 18 StrictMode runs effects twice in dev; allow resubscription
    let mounted = true;

    console.log('[Auth] 🚀 Setting up authentication listener...');

      // Utility: add timeout to async operations to prevent infinite loading
      const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            const id = setTimeout(() => {
              clearTimeout(id);
              reject(new Error(`${label} timed out after ${ms}ms`));
            }, ms);
          }) as Promise<T>,
        ]);
      };

    // Helper function to load user profile
    const loadUserProfile = async (userId: string, user: User, eventName: string) => {
      // Prevent duplicate processing for the same user
      if (currentUserId.current === userId) {
        console.log(`[Auth] ${eventName}: ✓ User ${userId.substring(0, 8)} already authenticated, skipping`);
        if (loading) setLoading(false);
        return;
      }

      try {
        console.log(`[Auth] ${eventName}: 📋 Loading profile for user ${userId.substring(0, 8)}...`);
        
        const authUser = mapSupabaseUser(user);
        
          const { data: profileData, error: profileError } = await withTimeout(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single(),
            20000,
            'Profile fetch'
          );

        if (!mounted) {
          console.log(`[Auth] ${eventName}: ⚠️ Component unmounted, aborting`);
          return;
        }

        if (profileError) {
          console.error(`[Auth] ${eventName}: ❌ Profile fetch failed:`, profileError.message);
          setLoading(false);
          return;
        }

        if (profileData) {
          currentUserId.current = userId;
          console.log(`[Auth] ${eventName}: ✅ Authenticated as ${authUser.email} (${profileData.role})`);
          login(authUser, profileData as Profile);
        } else {
          console.log(`[Auth] ${eventName}: ⚠️ No profile found`);
          setLoading(false);
        }
      } catch (err) {
        console.error(`[Auth] ${eventName}: ❌ Error:`, err);
        if (mounted) setLoading(false);
      }
    };

    // Listen to auth state changes - includes INITIAL_SESSION in v2
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] 🔔 Event: ${event}`);
        if (!mounted) return;

        if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
          await loadUserProfile(session.user.id, session.user, event);
        } else if (event === 'SIGNED_OUT') {
          console.log('[Auth] 👋 User signed out');
          currentUserId.current = null;
          storeLogout();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[Auth] 🔄 Token refreshed');
          // Profile data doesn't change on token refresh, no need to reload
        } else if (!session) {
          console.log('[Auth] ℹ️ No active session');
          currentUserId.current = null;
          if (loading) setLoading(false);
        }
      }
    );

    // Also perform a one-time session check in case listener misses in dev
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session?.user) {
          console.log('[Auth] 🔍 Initial session check: session present');
          const u = data.session.user;
          await loadUserProfile(u.id, u, 'INITIAL_SESSION_CHECK');
        } else {
          console.log('[Auth] 🔍 Initial session check: no session');
          if (loading) setLoading(false);
        }
      } catch (e) {
        console.error('[Auth] 🔍 Initial session check error:', e);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      console.log('[Auth] 🧹 Cleaning up auth listener');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    storeLogout();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { create } from 'zustand';
import { AuthUser, Profile } from '@/types';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (user: AuthUser, profile: Profile) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateProfile: (profile: Profile) => void;
  updateUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  login: (user, profile) => set({ user, profile, loading: false }),
  logout: () => set({ user: null, profile: null, loading: false }),
  setLoading: (loading) => set({ loading }),
  updateProfile: (profile) => set({ profile }),
  updateUser: (user) => set({ user }),
}));

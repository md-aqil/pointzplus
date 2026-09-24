// store/authStore.ts – Authentication Zustand state slice
import { create } from "zustand";
import { UserProfile } from "../lib/db";
import { apiClient } from "../lib/apiClient";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rememberMe: boolean;
  setUser: (user: UserProfile | null) => void;
  setRememberMe: (val: boolean) => void;
  signIn: (email: string, password?: string, fullName?: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
}

function formatNameFromEmail(email: string): string {
  const prefix = email.split("@")[0];
  return prefix
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  rememberMe: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setRememberMe: (rememberMe) => set({ rememberMe }),

  signIn: async (email, password, fullName) => {
    if (!password) {
      throw new Error("Password is required");
    }
    set({ isLoading: true });
    try {
      const res = await apiClient.login(email, password);
      const u = res.user;
      const profile: UserProfile = {
        id: u.id,
        name: u.name || fullName || formatNameFromEmail(email),
        email: u.email,
        phone: u.phone || "",
        totalPoints: 0,
        monthlyEarned: 0,
        expiringSoon: 0,
      };
      set({ user: profile, token: res.token, isAuthenticated: true, isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName, phone = "") => {
    set({ isLoading: true });
    try {
      const res = await apiClient.register(email, password, fullName, phone);
      const u = res.user;
      const profile: UserProfile = {
        id: u.id,
        name: u.name || fullName,
        email: u.email,
        phone: u.phone || phone,
        totalPoints: 0,
        monthlyEarned: 0,
        expiringSoon: 0,
      };
      set({ user: profile, token: res.token, isAuthenticated: true, isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    apiClient.clearToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateProfile: (data) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...data } : null,
    })),
}));

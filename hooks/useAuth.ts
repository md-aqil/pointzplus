// hooks/useAuth.ts – Per-field selectors ONLY (whole-store subscribe = app-wide re-render).
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const rememberMe = useAuthStore((state) => state.rememberMe);
  const signIn = useAuthStore((state) => state.signIn);
  const register = useAuthStore((state) => state.register);
  const signOut = useAuthStore((state) => state.signOut);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const setRememberMe = useAuthStore((state) => state.setRememberMe);

  return {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    register,
    signOut,
    updateProfile,
    rememberMe,
    setRememberMe,
  };
}

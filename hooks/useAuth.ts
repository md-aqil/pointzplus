// hooks/useAuth.ts
import { useAuthStore } from "../store/authStore";

export function useAuth() {
  const { user, isAuthenticated, isLoading, signIn, signOut, updateProfile, rememberMe, setRememberMe } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    updateProfile,
    rememberMe,
    setRememberMe,
  };
}

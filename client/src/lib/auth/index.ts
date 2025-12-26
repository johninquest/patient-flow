// Client and stores
export {
  authClient,
  authStore,
  currentUser,
  isAuthenticated,
  isLoading,
  isInitialized,
  initializeAuth,
  logout,
} from "./client";

// Auth actions
export { login, loginWithGoogle } from "./login";
export { register } from "./register";
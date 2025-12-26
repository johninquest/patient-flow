import { createAuthClient } from "better-auth/svelte";
import { writable, derived } from "svelte/store";
import { API_URL } from "$lib/config";

// Better Auth client instance
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "include",
  },
});

// Auth state store
interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    isLoading: true,
    isInitialized: false,
  });

  return {
    subscribe,
    setUser: (user: User | null) =>
      update((state) => ({ ...state, user, isLoading: false, isInitialized: true })),
    setLoading: (isLoading: boolean) => update((state) => ({ ...state, isLoading })),
    clear: () => set({ user: null, isLoading: false, isInitialized: true }),
    reset: () => set({ user: null, isLoading: true, isInitialized: false }),
  };
}

export const authStore = createAuthStore();

// Derived stores for convenience
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.user);
export const isLoading = derived(authStore, ($auth) => $auth.isLoading);
export const isInitialized = derived(authStore, ($auth) => $auth.isInitialized);

// Initialize session on app load
export async function initializeAuth(): Promise<void> {
  console.log("[Auth] Initializing auth...");

  try {
    const response = await authClient.getSession();
    console.log("[Auth] Session response:", response);

    if (response?.data?.user) {
      console.log("[Auth] User found:", response.data.user);
      authStore.setUser(response.data.user as User);
    } else {
      console.log("[Auth] No user in session");
      authStore.clear();
    }
  } catch (e) {
    console.error("[Auth] Failed to initialize auth:", e);
    authStore.clear();
  }
}

// Logout function
export async function logout(): Promise<void> {
  try {
    await authClient.signOut();
  } catch (e) {
    console.error("Logout error:", e);
  } finally {
    authStore.clear();
  }
}
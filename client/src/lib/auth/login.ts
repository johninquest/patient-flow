import { authClient, authStore } from "./client";

const CLIENT_URL = typeof window !== "undefined" 
  ? window.location.origin 
  : "http://localhost:5173";

interface AuthResult {
  success: boolean;
  error?: string;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      authStore.setUser(data.user as any);
      return { success: true };
    }

    return { success: false, error: "Login failed" };
  } catch (e: any) {
    console.error("Login error:", e);
    return { success: false, error: e.message ?? "Login failed" };
  }
}

export async function loginWithGoogle(): Promise<AuthResult> {
  try {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${CLIENT_URL}/dashboard`,
    });
    return { success: true };
  } catch (e: any) {
    console.error("Google login error:", e);
    return { success: false, error: e.message ?? "Google login failed" };
  }
}
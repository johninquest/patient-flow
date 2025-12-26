import { authClient, authStore } from "./client";

interface AuthResult {
  success: boolean;
  error?: string;
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  try {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: name ?? "",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      authStore.setUser(data.user as any);
      return { success: true };
    }

    return { success: false, error: "Registration failed" };
  } catch (e: any) {
    console.error("Register error:", e);
    return { success: false, error: e.message ?? "Registration failed" };
  }
}
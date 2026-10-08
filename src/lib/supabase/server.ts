import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthApi } from "@/lib/auth";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le middleware se charge de rafraîchir la session.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}

// Adaptateur typé entre le SDK et la logique pure de src/lib/auth.ts.
export function authApi(supabase: ServerSupabase): AuthApi {
  const auth = supabase.auth;
  return {
    signUp: (credentials) => auth.signUp(credentials),
    verifyOtp: (params) => auth.verifyOtp(params),
    resend: (params) => auth.resend(params),
    signInWithPassword: (credentials) => auth.signInWithPassword(credentials),
    resetPasswordForEmail: (email) => auth.resetPasswordForEmail(email),
    updateUser: (attributes) => auth.updateUser(attributes),
  };
}

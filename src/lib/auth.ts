import { authErrorMessage, type AuthErrorLike } from "@/lib/auth-errors";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { safeNext } from "@/lib/routes";
import {
  parseEmailOnly,
  parseNewPassword,
  parseOtp,
  parseReset,
  parseSignIn,
  parseSignUp,
  type AuthField,
} from "@/lib/validation";

type ErrorResult = Promise<{ error: AuthErrorLike }>;

export interface AuthApi {
  signUp(credentials: { email: string; password: string }): Promise<{
    data: { user: { identities?: unknown[] | null } | null };
    error: AuthErrorLike;
  }>;
  verifyOtp(params: { email: string; token: string; type: "email" | "recovery" }): ErrorResult;
  resend(params: { type: "signup"; email: string }): ErrorResult;
  signInWithPassword(credentials: { email: string; password: string }): ErrorResult;
  resetPasswordForEmail(email: string): ErrorResult;
  updateUser(attributes: { password: string }): ErrorResult;
}

type AuthState = FormState<AuthField>;
type Raw = Record<string, unknown>;

function fail(where: string, error: AuthErrorLike): AuthState {
  const message = authErrorMessage(error);
  if (message === GENERIC_ERROR) console.error(`[auth] ${where} :`, error?.message ?? error);
  return { ok: false, message };
}

const codePage = (email: string) => `/inscription/code?email=${encodeURIComponent(email)}`;

export async function signUpWithPassword(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseSignUp(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, password } = parsed.data;
  const { data, error } = await api.signUp({ email, password });
  if (error) return fail("inscription", error);
  // Supabase masque les emails déjà confirmés : réponse sans erreur mais sans identité.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, message: authErrorMessage({ code: "user_already_exists" }) };
  }
  return { ok: true, redirectTo: codePage(email) };
}

export async function verifySignupCode(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseOtp(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.verifyOtp({ email: parsed.data.email, token: parsed.data.code, type: "email" });
  if (error) return fail("vérification du code", error);
  return { ok: true, redirectTo: "/app/bienvenue" };
}

export async function resendSignupCode(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseEmailOnly(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.resend({ type: "signup", email: parsed.data.email });
  if (error) return fail("renvoi du code", error);
  return { ok: true, message: "Nouveau code envoyé." };
}

export async function signIn(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseSignIn(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, password } = parsed.data;
  const { error } = await api.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    await api.resend({ type: "signup", email });
    return { ok: true, redirectTo: codePage(email) };
  }
  if (error) return fail("connexion", error);
  return { ok: true, redirectTo: safeNext(typeof raw.next === "string" ? raw.next : null) };
}

export async function requestPasswordReset(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseEmailOnly(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.resetPasswordForEmail(parsed.data.email);
  if (error) return fail("demande de réinitialisation", error);
  return { ok: true, message: `Si un compte existe pour ${parsed.data.email}, un code vient d’être envoyé.` };
}

export async function resetPassword(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseReset(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { email, code, password } = parsed.data;
  const verified = await api.verifyOtp({ email, token: code, type: "recovery" });
  if (verified.error) return fail("code de réinitialisation", verified.error);
  const updated = await api.updateUser({ password });
  if (updated.error) return fail("nouveau mot de passe", updated.error);
  return { ok: true, redirectTo: "/app" };
}

export async function changePassword(api: AuthApi, raw: Raw): Promise<AuthState> {
  const parsed = parseNewPassword(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };
  const { error } = await api.updateUser({ password: parsed.data.password });
  if (error) return fail("changement de mot de passe", error);
  return { ok: true, message: "Mot de passe modifié ✓" };
}

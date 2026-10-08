import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changePassword,
  requestPasswordReset,
  resendSignupCode,
  resetPassword,
  signIn,
  signUpWithPassword,
  verifySignupCode,
  type AuthApi,
} from "@/lib/auth";
import { GENERIC_ERROR } from "@/lib/form-state";

const ok = async () => ({ error: null });

function fakeAuth(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    signUp: vi.fn(async () => ({ data: { user: { identities: [{}] } }, error: null })),
    verifyOtp: vi.fn(ok),
    resend: vi.fn(ok),
    signInWithPassword: vi.fn(ok),
    resetPasswordForEmail: vi.fn(ok),
    updateUser: vi.fn(ok),
    ...overrides,
  };
}

afterEach(() => vi.restoreAllMocks());

describe("signUpWithPassword", () => {
  const form = { email: "Awa@Exemple.sn", password: "motdepasse", terms: "on" };

  it("crée le compte et redirige vers la saisie du code", async () => {
    const api = fakeAuth();
    expect(await signUpWithPassword(api, form)).toEqual({ ok: true, redirectTo: "/inscription/code?email=awa%40exemple.sn" });
    expect(api.signUp).toHaveBeenCalledWith({ email: "awa@exemple.sn", password: "motdepasse" });
  });

  it("renvoie les erreurs de champ sans appeler Supabase", async () => {
    const api = fakeAuth();
    const state = await signUpWithPassword(api, { email: "x", password: "1" });
    expect(state.ok).toBe(false);
    expect(state.fieldErrors?.email).toBe("Email invalide");
    expect(api.signUp).not.toHaveBeenCalled();
  });

  it("signale un email déjà inscrit (réponse masquée de Supabase)", async () => {
    const api = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: { identities: [] } }, error: null })) });
    expect(await signUpWithPassword(api, form)).toEqual({ ok: false, message: "Cet email a déjà un compte. Connectez-vous." });
  });

  it("traduit une limite d’envoi", async () => {
    const api = fakeAuth({
      signUp: vi.fn(async () => ({ data: { user: null }, error: { code: "over_email_send_rate_limit", status: 429 } })),
    });
    expect((await signUpWithPassword(api, form)).message).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("journalise une erreur inattendue", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const api = fakeAuth({ signUp: vi.fn(async () => ({ data: { user: null }, error: { code: "unexpected_failure", message: "boom" } })) });
    expect((await signUpWithPassword(api, form)).message).toBe(GENERIC_ERROR);
    expect(log).toHaveBeenCalled();
  });
});

describe("verifySignupCode / resendSignupCode", () => {
  it("valide le code et envoie vers l’onboarding", async () => {
    const api = fakeAuth();
    expect(await verifySignupCode(api, { email: "awa@exemple.sn", code: "123 456" })).toEqual({ ok: true, redirectTo: "/app/bienvenue" });
    expect(api.verifyOtp).toHaveBeenCalledWith({ email: "awa@exemple.sn", token: "123456", type: "email" });
  });

  it("signale un code expiré", async () => {
    const api = fakeAuth({ verifyOtp: vi.fn(async () => ({ error: { code: "otp_expired" } })) });
    expect((await verifySignupCode(api, { email: "awa@exemple.sn", code: "123456" })).message).toBe(
      "Code incorrect ou expiré. Demandez-en un nouveau.",
    );
  });

  it("renvoie un nouveau code", async () => {
    const api = fakeAuth();
    expect(await resendSignupCode(api, { email: "awa@exemple.sn" })).toEqual({ ok: true, message: "Nouveau code envoyé." });
    expect(api.resend).toHaveBeenCalledWith({ type: "signup", email: "awa@exemple.sn" });
  });
});

describe("signIn", () => {
  const form = { email: "awa@exemple.sn", password: "motdepasse" };

  it("redirige vers la page demandée si elle est interne", async () => {
    expect(await signIn(fakeAuth(), { ...form, next: "/app/clients" })).toEqual({ ok: true, redirectTo: "/app/clients" });
    expect(await signIn(fakeAuth(), { ...form, next: "https://evil.example" })).toEqual({ ok: true, redirectTo: "/app" });
  });

  it("renvoie vers la saisie du code si l’email n’est pas confirmé", async () => {
    const api = fakeAuth({ signInWithPassword: vi.fn(async () => ({ error: { code: "email_not_confirmed" } })) });
    expect(await signIn(api, form)).toEqual({ ok: true, redirectTo: "/inscription/code?email=awa%40exemple.sn" });
    expect(api.resend).toHaveBeenCalledWith({ type: "signup", email: "awa@exemple.sn" });
  });

  it("signale des identifiants invalides", async () => {
    const api = fakeAuth({ signInWithPassword: vi.fn(async () => ({ error: { code: "invalid_credentials" } })) });
    expect(await signIn(api, form)).toEqual({ ok: false, message: "Email ou mot de passe incorrect." });
  });
});

describe("mot de passe", () => {
  it("demande un code de réinitialisation", async () => {
    const api = fakeAuth();
    const state = await requestPasswordReset(api, { email: "awa@exemple.sn" });
    expect(state.ok).toBe(true);
    expect(state.message).toContain("awa@exemple.sn");
    expect(api.resetPasswordForEmail).toHaveBeenCalledWith("awa@exemple.sn");
  });

  it("vérifie le code puis change le mot de passe", async () => {
    const api = fakeAuth();
    expect(await resetPassword(api, { email: "awa@exemple.sn", code: "654321", password: "nouveaumdp" })).toEqual({
      ok: true,
      redirectTo: "/app",
    });
    expect(api.verifyOtp).toHaveBeenCalledWith({ email: "awa@exemple.sn", token: "654321", type: "recovery" });
    expect(api.updateUser).toHaveBeenCalledWith({ password: "nouveaumdp" });
  });

  it("ne change pas le mot de passe si le code est refusé", async () => {
    const api = fakeAuth({ verifyOtp: vi.fn(async () => ({ error: { code: "otp_expired" } })) });
    const state = await resetPassword(api, { email: "awa@exemple.sn", code: "654321", password: "nouveaumdp" });
    expect(state.ok).toBe(false);
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it("change le mot de passe depuis les paramètres", async () => {
    expect(await changePassword(fakeAuth(), { password: "nouveaumdp" })).toEqual({ ok: true, message: "Mot de passe modifié ✓" });
  });
});

import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";
import { GENERIC_ERROR } from "@/lib/form-state";

describe("authErrorMessage", () => {
  it("traduit les erreurs connues de Supabase Auth", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("Email ou mot de passe incorrect.");
    expect(authErrorMessage({ code: "email_not_confirmed" })).toBe("Confirmez d’abord votre email.");
    expect(authErrorMessage({ code: "user_already_exists" })).toBe("Cet email a déjà un compte. Connectez-vous.");
    expect(authErrorMessage({ code: "otp_expired" })).toBe("Code incorrect ou expiré. Demandez-en un nouveau.");
    expect(authErrorMessage({ code: "over_email_send_rate_limit" })).toBe("Trop de tentatives. Réessayez dans une minute.");
    expect(authErrorMessage({ code: "weak_password" })).toBe("Mot de passe trop faible : 8 caractères minimum.");
  });

  it("reconnaît une limite de débit par son statut HTTP", () => {
    expect(authErrorMessage({ status: 429, message: "Too many" })).toBe("Trop de tentatives. Réessayez dans une minute.");
  });

  it("renvoie le message générique pour le reste", () => {
    expect(authErrorMessage({ code: "unexpected_failure", message: "boom" })).toBe(GENERIC_ERROR);
    expect(authErrorMessage(null)).toBe(GENERIC_ERROR);
  });
});

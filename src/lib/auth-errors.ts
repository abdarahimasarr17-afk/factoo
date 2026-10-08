import { GENERIC_ERROR } from "@/lib/form-state";

export type AuthErrorLike = { code?: string; status?: number; message?: string } | null | undefined;

const RATE_LIMIT = "Trop de tentatives. Réessayez dans une minute.";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  email_not_confirmed: "Confirmez d’abord votre email.",
  user_already_exists: "Cet email a déjà un compte. Connectez-vous.",
  email_exists: "Cet email a déjà un compte. Connectez-vous.",
  otp_expired: "Code incorrect ou expiré. Demandez-en un nouveau.",
  over_email_send_rate_limit: RATE_LIMIT,
  over_request_rate_limit: RATE_LIMIT,
  weak_password: "Mot de passe trop faible : 8 caractères minimum.",
  same_password: "Choisissez un mot de passe différent de l’ancien.",
};

export function authErrorMessage(error: AuthErrorLike): string {
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error?.status === 429) return RATE_LIMIT;
  return GENERIC_ERROR;
}

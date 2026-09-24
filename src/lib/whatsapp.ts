export const WHATSAPP_DEFAULT_MESSAGE = "Bonjour, je suis intéressé(e) par Factoo.";

export function whatsappLink(number: string | undefined, message: string = WHATSAPP_DEFAULT_MESSAGE): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function siteWhatsappLink(): string | null {
  return whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

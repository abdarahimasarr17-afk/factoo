export const WHATSAPP_DEFAULT_MESSAGE = "Bonjour, je suis intéressé(e) par Factoo.";

export function whatsappLink(number: string | undefined, message: string = WHATSAPP_DEFAULT_MESSAGE): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function siteWhatsappLink(): string | null {
  return whatsappLink(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
}

export function invoiceWhatsappMessage(p: {
  clientName: string;
  number: string;
  total: string;
  dueDate: string | null;
  url: string;
  companyName: string;
}): string {
  const due = p.dueDate ? `avant le ${p.dueDate}` : "à réception";
  return `Bonjour ${p.clientName}, voici votre facture ${p.number} de ${p.total}, à régler ${due}. Consultez-la et téléchargez-la ici : ${p.url}. Merci, ${p.companyName}`;
}

// Sans numéro, WhatsApp demande à l'utilisateur de choisir le contact.
export function invoiceWhatsappLink(phone: string | null, message: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

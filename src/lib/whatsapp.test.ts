import { describe, expect, it } from "vitest";
import { invoiceWhatsappLink, invoiceWhatsappMessage, WHATSAPP_DEFAULT_MESSAGE, whatsappLink } from "@/lib/whatsapp";

describe("whatsappLink", () => {
  it("construit un lien wa.me avec le message encodé", () => {
    expect(whatsappLink("221770000000", "Bonjour Factoo")).toBe(
      "https://wa.me/221770000000?text=Bonjour%20Factoo",
    );
  });

  it("nettoie le + et les espaces du numéro", () => {
    expect(whatsappLink("+221 77 000 00 00")).toBe(
      `https://wa.me/221770000000?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`,
    );
  });

  it("retourne null si aucun numéro n'est configuré", () => {
    expect(whatsappLink(undefined)).toBeNull();
    expect(whatsappLink("")).toBeNull();
  });
});

describe("message de facture", () => {
  it("avec échéance", () => {
    expect(
      invoiceWhatsappMessage({ clientName: "Awa", number: "FAC-2026-0001", total: "150 000 FCFA", dueDate: "14/11/2026", url: "https://factoo.app/f/abc", companyName: "COSENDIGITAL" }),
    ).toBe("Bonjour Awa, voici votre facture FAC-2026-0001 de 150 000 FCFA, à régler avant le 14/11/2026. Consultez-la et téléchargez-la ici : https://factoo.app/f/abc. Merci, COSENDIGITAL");
  });
  it("à réception", () => {
    expect(invoiceWhatsappMessage({ clientName: "Awa", number: "FAC-2026-0001", total: "1 €", dueDate: null, url: "u", companyName: "X" })).toContain("à régler à réception.");
  });
  it("lien avec ou sans numéro", () => {
    expect(invoiceWhatsappLink("+221771234567", "a b")).toBe("https://wa.me/221771234567?text=a%20b");
    expect(invoiceWhatsappLink(null, "a b")).toBe("https://wa.me/?text=a%20b");
  });
});

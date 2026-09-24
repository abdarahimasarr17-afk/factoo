import { describe, expect, it } from "vitest";
import { WHATSAPP_DEFAULT_MESSAGE, whatsappLink } from "@/lib/whatsapp";

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

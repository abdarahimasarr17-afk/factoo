import { describe, expect, it } from "vitest";
import { formatPhone, splitPhone } from "@/lib/phone";

describe("splitPhone", () => {
  it("sépare l’indicatif connu du numéro local", () => {
    expect(splitPhone("+221771234567")).toEqual({ countryCode: "221", phone: "771234567" });
    expect(splitPhone("+2250701020304")).toEqual({ countryCode: "225", phone: "0701020304" });
    expect(splitPhone("+237699112233")).toEqual({ countryCode: "237", phone: "699112233" });
  });

  it("renvoie l’indicatif par défaut quand il n’y a pas de numéro", () => {
    expect(splitPhone(null)).toEqual({ countryCode: "221", phone: "" });
    expect(splitPhone(null, "225")).toEqual({ countryCode: "225", phone: "" });
  });
});

describe("formatPhone", () => {
  it("formate les numéros pour l’affichage", () => {
    expect(formatPhone("+221771234567")).toBe("+221 77 123 45 67");
    expect(formatPhone("+2250701020304")).toBe("+225 07 01 02 03 04");
    expect(formatPhone("+22670112233")).toBe("+226 70 11 22 33");
    expect(formatPhone(null)).toBe("");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { submitWaitlist, type InsertWaitlist } from "@/lib/waitlist";

function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const values = {
    countryCode: "221",
    phone: "771234567",
    country: "SN",
    profile: "pme",
    email: "",
    website: "",
    ...overrides,
  };
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const ok: InsertWaitlist = async () => ({ error: null });

afterEach(() => vi.restoreAllMocks());

describe("submitWaitlist", () => {
  it("insère une inscription valide", async () => {
    const insert = vi.fn(ok);
    const state = await submitWaitlist(form(), insert);
    expect(state).toEqual({ status: "success", already: false });
    expect(insert).toHaveBeenCalledWith({ phone: "+221771234567", email: null, country: "SN", profile: "pme" });
  });

  it("ignore silencieusement les bots (honeypot rempli)", async () => {
    const insert = vi.fn(ok);
    const state = await submitWaitlist(form({ website: "http://spam.example" }), insert);
    expect(state).toEqual({ status: "success", already: false });
    expect(insert).not.toHaveBeenCalled();
  });

  it("retourne les erreurs de champ sans insérer", async () => {
    const insert = vi.fn(ok);
    const state = await submitWaitlist(form({ phone: "12" }), insert);
    expect(state).toEqual({ status: "invalid", fieldErrors: { phone: "Numéro invalide : 8 à 10 chiffres" } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("traite un doublon (23505) comme déjà inscrit", async () => {
    const insert: InsertWaitlist = async () => ({ error: { code: "23505", message: "duplicate key" } });
    expect(await submitWaitlist(form(), insert)).toEqual({ status: "success", already: true });
  });

  it("retourne une erreur serveur et la logue", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const insert: InsertWaitlist = async () => ({ error: { code: "XX000", message: "boom" } });
    expect(await submitWaitlist(form(), insert)).toEqual({ status: "error" });
    expect(log).toHaveBeenCalled();
  });

  it("retourne une erreur serveur si l'insertion lève une exception", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const insert: InsertWaitlist = async () => {
      throw new Error("Supabase env missing");
    };
    expect(await submitWaitlist(form(), insert)).toEqual({ status: "error" });
  });
});

import { describe, expect, it } from "vitest";
import { routeDecision, safeNext } from "@/lib/routes";

describe("routeDecision", () => {
  it("renvoie un visiteur de /app vers la connexion en gardant la page demandée", () => {
    expect(routeDecision("/app/clients", "?q=awa", false)).toBe("/connexion?next=%2Fapp%2Fclients%3Fq%3Dawa");
    expect(routeDecision("/app", "", false)).toBe("/connexion?next=%2Fapp");
  });

  it("laisse passer un utilisateur connecté sur /app", () => {
    expect(routeDecision("/app/parametres", "", true)).toBeNull();
  });

  it("renvoie un utilisateur connecté des pages d’auth vers /app", () => {
    expect(routeDecision("/connexion", "", true)).toBe("/app");
    expect(routeDecision("/inscription/code", "?email=a%40b.sn", true)).toBe("/app");
    expect(routeDecision("/mot-de-passe-oublie", "", true)).toBe("/app");
  });

  it("laisse un visiteur sur les pages d’auth et ignore le reste du site", () => {
    expect(routeDecision("/connexion", "", false)).toBeNull();
    expect(routeDecision("/", "", false)).toBeNull();
    expect(routeDecision("/application", "", false)).toBeNull();
  });
});

describe("safeNext", () => {
  it("accepte uniquement une destination interne à /app", () => {
    expect(safeNext("/app/clients?q=a")).toBe("/app/clients?q=a");
    expect(safeNext("/app")).toBe("/app");
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("//evil.example/app")).toBe("/app");
    expect(safeNext("/connexion")).toBe("/app");
    expect(safeNext(null)).toBe("/app");
  });
});

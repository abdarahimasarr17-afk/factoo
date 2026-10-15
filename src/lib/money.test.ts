// src/lib/money.test.ts
import { describe, expect, it } from "vitest";
import { formatCompact, formatMoney, minorToInput, parseAmount } from "@/lib/money";

const NB = " ";

describe("parseAmount", () => {
  it("lit un montant en FCFA (entier, espaces tolérés)", () => {
    expect(parseAmount("150000", "XOF")).toBe(150000);
    expect(parseAmount("150 000", "XOF")).toBe(150000);
    expect(parseAmount(`1${NB}250`, "XAF")).toBe(1250);
    expect(parseAmount("0", "XOF")).toBe(0);
  });
  it("refuse les décimales en FCFA", () => {
    expect(parseAmount("10,5", "XOF")).toBeNull();
  });
  it("lit un montant en euros avec virgule ou point", () => {
    expect(parseAmount("1 250,50", "EUR")).toBe(125050);
    expect(parseAmount("12.5", "EUR")).toBe(1250);
    expect(parseAmount("3", "EUR")).toBe(300);
    expect(parseAmount("1,234", "EUR")).toBeNull();
  });
  it("refuse le vide, le négatif et le texte", () => {
    expect(parseAmount("", "XOF")).toBeNull();
    expect(parseAmount("-5", "XOF")).toBeNull();
    expect(parseAmount("abc", "EUR")).toBeNull();
  });
});

describe("minorToInput", () => {
  it("prépare la valeur d’un champ", () => {
    expect(minorToInput(150000, "XOF")).toBe("150000");
    expect(minorToInput(125050, "EUR")).toBe("1250,50");
    expect(minorToInput(300, "EUR")).toBe("3");
  });
});

describe("formatMoney", () => {
  it("formate FCFA sans décimales", () => {
    expect(formatMoney(150000, "XOF")).toBe(`150${NB}000${NB}FCFA`);
    expect(formatMoney(0, "XAF")).toBe(`0${NB}FCFA`);
    expect(formatMoney(1234567, "XOF")).toBe(`1${NB}234${NB}567${NB}FCFA`);
  });
  it("formate l’euro avec 2 décimales", () => {
    expect(formatMoney(125050, "EUR")).toBe(`1${NB}250,50${NB}€`);
    expect(formatMoney(5, "EUR")).toBe(`0,05${NB}€`);
  });
});

describe("formatCompact", () => {
  it("abrège les grands montants", () => {
    expect(formatCompact(950, "XOF")).toBe("950");
    expect(formatCompact(85000, "XOF")).toBe("85 k");
    expect(formatCompact(1250000, "XOF")).toBe("1,3 M");
    expect(formatCompact(125050, "EUR")).toBe("1,3 k");
  });
});

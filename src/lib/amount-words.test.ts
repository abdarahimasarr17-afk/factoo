// src/lib/amount-words.test.ts
import { describe, expect, it } from "vitest";
import { amountInWords, numberToFrench } from "@/lib/amount-words";

describe("numberToFrench", () => {
  it.each([
    [0, "zéro"], [1, "un"], [16, "seize"], [17, "dix-sept"], [21, "vingt et un"], [22, "vingt-deux"],
    [70, "soixante-dix"], [71, "soixante et onze"], [77, "soixante-dix-sept"], [80, "quatre-vingts"],
    [81, "quatre-vingt-un"], [90, "quatre-vingt-dix"], [91, "quatre-vingt-onze"], [100, "cent"], [101, "cent un"],
    [200, "deux cents"], [201, "deux cent un"], [1000, "mille"], [1001, "mille un"], [1250, "mille deux cent cinquante"],
    [21000, "vingt et un mille"], [80000, "quatre-vingt mille"], [150000, "cent cinquante mille"],
    [200000, "deux cent mille"], [1000000, "un million"], [2000000, "deux millions"],
    [200000000, "deux cents millions"], [1000000000, "un milliard"], [2500000, "deux millions cinq cent mille"],
  ])("%i → %s", (n, words) => {
    expect(numberToFrench(n)).toBe(words);
  });
});

describe("amountInWords", () => {
  it("francs CFA", () => {
    expect(amountInWords(150000, "XOF")).toBe("cent cinquante mille francs CFA");
    expect(amountInWords(1, "XAF")).toBe("un franc CFA");
    expect(amountInWords(0, "XOF")).toBe("zéro franc CFA");
    expect(amountInWords(2000000, "XOF")).toBe("deux millions de francs CFA");
  });
  it("euros et centimes", () => {
    expect(amountInWords(125050, "EUR")).toBe("mille deux cent cinquante euros et cinquante centimes");
    expect(amountInWords(100, "EUR")).toBe("un euro");
    expect(amountInWords(101, "EUR")).toBe("un euro et un centime");
    expect(amountInWords(50, "EUR")).toBe("zéro euro et cinquante centimes");
    expect(amountInWords(100000000, "EUR")).toBe("un million d’euros");
  });
});

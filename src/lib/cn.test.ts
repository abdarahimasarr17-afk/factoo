import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("joint les classes et ignore les valeurs vides", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
});

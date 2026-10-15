// src/lib/invoice-status.test.ts
import { describe, expect, it } from "vitest";
import { addDays, displayStatus, dueDateFor, formatDateFr, todayInDakar } from "@/lib/invoice-status";

describe("dates", () => {
  it("aujourd’hui à Dakar (UTC)", () => {
    expect(todayInDakar(new Date("2026-10-15T23:30:00Z"))).toBe("2026-10-15");
  });
  it("ajoute des jours en changeant de mois et d’année", () => {
    expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
    expect(addDays("2026-02-15", 15)).toBe("2026-03-02");
  });
  it("échéance selon le choix rapide", () => {
    expect(dueDateFor("0", "2026-10-15", null)).toBe("2026-10-15");
    expect(dueDateFor("15", "2026-10-15", null)).toBe("2026-10-30");
    expect(dueDateFor("30", "2026-10-15", null)).toBe("2026-11-14");
    expect(dueDateFor("date", "2026-10-15", "2026-12-01")).toBe("2026-12-01");
    expect(dueDateFor("date", "2026-10-15", null)).toBeNull();
  });
  it("format français", () => {
    expect(formatDateFr("2026-11-14")).toBe("14/11/2026");
  });
});

describe("displayStatus", () => {
  const today = "2026-10-15";
  it("brouillon, payée, annulée", () => {
    expect(displayStatus({ status: "draft", due_date: null }, today)).toBe("draft");
    expect(displayStatus({ status: "paid", due_date: "2026-01-01" }, today)).toBe("paid");
    expect(displayStatus({ status: "cancelled", due_date: "2026-01-01" }, today)).toBe("cancelled");
  });
  it("échéance aujourd’hui : en attente ; hier : en retard", () => {
    expect(displayStatus({ status: "issued", due_date: "2026-10-15" }, today)).toBe("pending");
    expect(displayStatus({ status: "issued", due_date: "2026-10-14" }, today)).toBe("overdue");
  });
});

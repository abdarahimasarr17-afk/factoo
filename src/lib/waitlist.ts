import { parseWaitlist, type WaitlistField, type WaitlistRow } from "@/lib/validation";

export type WaitlistState =
  | { status: "idle" }
  | { status: "success"; already: boolean }
  | { status: "invalid"; fieldErrors: Partial<Record<WaitlistField, string>> }
  | { status: "error" };

export type InsertWaitlist = (
  row: WaitlistRow,
) => Promise<{ error: { code?: string; message: string } | null }>;

const FIELDS: WaitlistField[] = ["countryCode", "phone", "country", "profile", "email"];
const UNIQUE_VIOLATION = "23505";

export async function submitWaitlist(formData: FormData, insert: InsertWaitlist): Promise<WaitlistState> {
  const honeypot = formData.get("website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { status: "success", already: false };
  }

  const raw = Object.fromEntries(FIELDS.map((field) => [field, formData.get(field)]));
  const parsed = parseWaitlist(raw);
  if (!parsed.success) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  try {
    const { error } = await insert(parsed.data);
    if (!error) return { status: "success", already: false };
    if (error.code === UNIQUE_VIOLATION) return { status: "success", already: true };
    console.error("[waitlist] insertion refusée :", error.message);
  } catch (err) {
    console.error("[waitlist] insertion impossible :", err);
  }
  return { status: "error" };
}

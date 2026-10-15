import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, ClientsRepo } from "@/lib/clients";
import type { Profile } from "@/lib/profile";
import type { DashboardRow } from "@/lib/dashboard";
import type { ListRow } from "@/lib/invoice-list";
import type { BuyerSnapshot, InvoiceLine, InvoiceRecord } from "@/lib/invoice-types";
import type { InvoicesRepo } from "@/lib/invoices";
import type { ProfileRepo } from "@/lib/settings";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const CLIENT_COLUMNS = "id,name,phone,email,address,city,country,tax_id";

export function profileRepo(supabase: SupabaseClient, userId: string): ProfileRepo {
  return {
    async update(patch) {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      return { error };
    },
    async uploadLogo(data) {
      const path = `${userId}/logo-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("logos").upload(path, data, { contentType: "image/webp" });
      return { error: error ? { message: error.message } : null, path };
    },
    async removeLogo(path) {
      const { error } = await supabase.storage.from("logos").remove([path]);
      return { error: error ? { message: error.message } : null };
    },
  };
}

export function clientsRepo(supabase: SupabaseClient, userId: string): ClientsRepo {
  return {
    async create(row) {
      const { data, error } = await supabase.from("clients").insert({ ...row, user_id: userId }).select("id").single();
      return { error, id: data?.id };
    },
    async update(id, row) {
      const { data, error } = await supabase.from("clients").update(row).eq("id", id).is("archived_at", null).select("id");
      return { error, found: (data?.length ?? 0) > 0 };
    },
    async archive(id) {
      const { data, error } = await supabase
        .from("clients")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id)
        .is("archived_at", null)
        .select("id");
      return { error, found: (data?.length ?? 0) > 0 };
    },
  };
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) throw new Error(`[profil] lecture impossible : ${error?.message ?? "profil absent"}`);
  return { ...data, vat_rate: Number(data.vat_rate), default_due_days: Number(data.default_due_days ?? 30) } as Profile;
}

export async function listClients(supabase: SupabaseClient, search: string): Promise<Client[]> {
  let query = supabase.from("clients").select(CLIENT_COLUMNS).is("archived_at", null).order("name");
  const term = search.replace(/[%_,()*]/g, " ").trim();
  if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term.replace(/\s/g, "")}%`);
  const { data, error } = await query;
  if (error) throw new Error(`[clients] liste impossible : ${error.message}`);
  return (data ?? []) as Client[];
}

export async function getClient(supabase: SupabaseClient, id: string): Promise<Client | null> {
  const { data } = await supabase.from("clients").select(CLIENT_COLUMNS).eq("id", id).is("archived_at", null).maybeSingle();
  return (data as Client | null) ?? null;
}

const INVOICE_COLUMNS =
  "id,client_id,status,number,issue_date,due_kind,due_date,currency,vat_rate,discount_type,discount_value,note,subtotal,discount_amount,vat_amount,total,seller,buyer,public_token,paid_at,payment_method,updated_at";
const LINE_COLUMNS = "position,description,quantity,unit_price,line_total";

// PostgREST renvoie numeric en chaîne : on normalise une fois ici.
function toRecord(row: Record<string, unknown>): InvoiceRecord {
  return {
    ...(row as unknown as InvoiceRecord),
    vat_rate: Number(row.vat_rate),
    discount_value: row.discount_value === null ? null : Number(row.discount_value),
    subtotal: Number(row.subtotal),
    discount_amount: Number(row.discount_amount),
    vat_amount: Number(row.vat_amount),
    total: Number(row.total),
  };
}

const toLines = (rows: Record<string, unknown>[] | null): InvoiceLine[] =>
  (rows ?? []).map((l) => ({
    position: Number(l.position),
    description: String(l.description),
    quantity: Number(l.quantity),
    unit_price: Number(l.unit_price),
    line_total: Number(l.line_total),
  }));

export function invoicesRepo(supabase: SupabaseClient, userId: string, logoPath: string | null): InvoicesRepo {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(fn, args);
    return { data, error: error ? { code: error.code, message: error.message } : null };
  };
  return {
    async saveDraft(id, data, lines) {
      const r = await rpc("save_invoice_draft", { p_id: id, p_data: data, p_lines: lines });
      return { error: r.error, id: (r.data as string | null) ?? undefined };
    },
    async copyLogo(invoiceId) {
      if (!logoPath) return null;
      const target = `${userId}/factures/${invoiceId}.webp`;
      await supabase.storage.from("logos").remove([target]);
      const { error } = await supabase.storage.from("logos").copy(logoPath, target);
      if (error) {
        console.error("[factures] copie du logo :", error.message);
        return null;
      }
      return target;
    },
    async issue(id, path) {
      const r = await rpc("issue_invoice", { p_id: id, p_logo_path: path });
      return { error: r.error, number: (r.data as string | null) ?? undefined };
    },
    markPaid: (id, paidAt, method) => rpc("mark_invoice_paid", { p_id: id, p_paid_at: paidAt, p_method: method }),
    unmarkPaid: (id) => rpc("unmark_invoice_paid", { p_id: id }),
    cancel: (id) => rpc("cancel_invoice", { p_id: id }),
    async deleteDraft(id) {
      const { data, error } = await supabase.from("invoices").delete().eq("id", id).eq("status", "draft").select("id");
      return { error, found: (data?.length ?? 0) > 0 };
    },
  };
}

type RowWithClient = Record<string, unknown> & { buyer: { name?: string } | null; clients: { name: string } | null };

export async function listInvoiceRows(supabase: SupabaseClient): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id,number,status,due_date,total,currency,updated_at,issued_at,paid_at,buyer,clients(name)")
    .limit(2000);
  if (error) throw new Error(`[factures] liste impossible : ${error.message}`);
  return ((data ?? []) as unknown as RowWithClient[]).map((r) => ({
    id: String(r.id),
    number: (r.number as string | null) ?? null,
    status: r.status as ListRow["status"],
    due_date: (r.due_date as string | null) ?? null,
    total: Number(r.total),
    currency: r.currency as ListRow["currency"],
    updated_at: String(r.updated_at),
    issued_at: (r.issued_at as string | null) ?? null,
    client_name: r.buyer?.name ?? r.clients?.name ?? null,
  }));
}

export async function dashboardRows(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("invoices")
    .select("id,number,status,due_date,total,currency,updated_at,issued_at,paid_at,buyer,clients(name)")
    .limit(5000);
  if (error) throw new Error(`[factures] tableau de bord impossible : ${error.message}`);
  return ((data ?? []) as unknown as RowWithClient[]).map((r) => ({
    id: String(r.id),
    number: (r.number as string | null) ?? null,
    status: r.status as DashboardRow["status"],
    due_date: (r.due_date as string | null) ?? null,
    paid_at: (r.paid_at as string | null) ?? null,
    total: Number(r.total),
    currency: r.currency as DashboardRow["currency"],
    updated_at: String(r.updated_at),
    issued_at: (r.issued_at as string | null) ?? null,
    client_name: r.buyer?.name ?? r.clients?.name ?? null,
  }));
}

export async function getInvoice(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("invoices")
    .select(`${INVOICE_COLUMNS},invoice_lines(${LINE_COLUMNS}),clients(id,name,phone,email,address,city,country,tax_id)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    record: toRecord(row),
    lines: toLines(row.invoice_lines as Record<string, unknown>[]),
    client: (row.clients as (BuyerSnapshot & { id: string }) | null) ?? null,
  };
}

// Page publique : client service_role, filtre strict sur le jeton, jamais de brouillon.
export async function getPublicInvoice(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const { data } = await getSupabaseAdmin()
    .from("invoices")
    .select(`${INVOICE_COLUMNS},invoice_lines(${LINE_COLUMNS})`)
    .eq("public_token", token)
    .neq("status", "draft")
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { record: toRecord(row), lines: toLines(row.invoice_lines as Record<string, unknown>[]) };
}

export async function listClientOptions(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("clients").select("id,name,phone").is("archived_at", null).order("name");
  if (error) throw new Error(`[clients] liste impossible : ${error.message}`);
  return (data ?? []) as { id: string; name: string; phone: string | null }[];
}

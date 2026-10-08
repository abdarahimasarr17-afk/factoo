import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, ClientsRepo } from "@/lib/clients";
import type { Profile } from "@/lib/profile";
import type { ProfileRepo } from "@/lib/settings";

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
      const { error } = await supabase.from("clients").insert({ ...row, user_id: userId });
      return { error };
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
  return { ...data, vat_rate: Number(data.vat_rate) } as Profile;
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

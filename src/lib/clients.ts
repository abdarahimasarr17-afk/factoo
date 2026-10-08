import type { DbResult } from "@/lib/db";
import { GENERIC_ERROR, type FormState } from "@/lib/form-state";
import { splitPhone } from "@/lib/phone";
import { parseClient, type ClientField, type ClientInput } from "@/lib/validation";

export type Client = ClientInput & { id: string };

export interface ClientsRepo {
  create(row: ClientInput): Promise<DbResult>;
  update(id: string, row: ClientInput): Promise<DbResult & { found: boolean }>;
  archive(id: string): Promise<DbResult & { found: boolean }>;
}

export const CLIENT_FLASH: Record<string, string> = {
  ajoute: "Client ajouté ✓",
  modifie: "Client modifié ✓",
  archive: "Client archivé.",
};

const NOT_FOUND = "Client introuvable.";

function dbFail(where: string, error: { message: string }): FormState<ClientField> {
  console.error(`[clients] ${where} :`, error.message);
  return { ok: false, message: GENERIC_ERROR };
}

export async function saveClient(
  repo: ClientsRepo,
  id: string | null,
  raw: Record<string, unknown>,
): Promise<FormState<ClientField>> {
  const parsed = parseClient(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (id === null) {
    const { error } = await repo.create(parsed.data);
    if (error) return dbFail("création", error);
    return { ok: true, redirectTo: "/app/clients?ok=ajoute" };
  }

  const { error, found } = await repo.update(id, parsed.data);
  if (error) return dbFail("modification", error);
  if (!found) return { ok: false, message: NOT_FOUND };
  return { ok: true, redirectTo: "/app/clients?ok=modifie" };
}

export async function archiveClient(repo: ClientsRepo, id: string): Promise<FormState> {
  const { error, found } = await repo.archive(id);
  if (error) return dbFail("archivage", error);
  if (!found) return { ok: false, message: NOT_FOUND };
  return { ok: true, redirectTo: "/app/clients?ok=archive" };
}

export function clientToFormValues(client: Client | null, defaultDial: string) {
  const { countryCode, phone } = splitPhone(client?.phone ?? null, defaultDial);
  return {
    name: client?.name ?? "",
    countryCode,
    phone,
    email: client?.email ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    country: client?.country ?? "",
    taxId: client?.tax_id ?? "",
  };
}

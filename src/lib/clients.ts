import type { DbResult } from "@/lib/db";
import type { ClientInput } from "@/lib/validation";

export type Client = ClientInput & { id: string };

export interface ClientsRepo {
  create(row: ClientInput): Promise<DbResult>;
  update(id: string, row: ClientInput): Promise<DbResult & { found: boolean }>;
  archive(id: string): Promise<DbResult & { found: boolean }>;
}

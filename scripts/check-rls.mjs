// Vérifie l’isolation entre deux comptes (RLS tables + stockage). Usage : npm run check:rls
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !service || !anon) {
  console.error("Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const password = `Rls-${stamp}-ok!`;
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` — ${extra}` : ""}`);
const created = [];

async function makeUser(tag) {
  const email = `rls-${tag}-${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  created.push(data.user.id);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

try {
  const a = await makeUser("a");
  const b = await makeUser("b");

  const { data: ownProfile } = await a.client.from("profiles").select("id").eq("id", a.id);
  check("le profil est créé automatiquement à l’inscription", ownProfile?.length === 1);

  const { data: inserted, error: insertError } = await a.client
    .from("clients")
    .insert({ user_id: a.id, name: "Client de A" })
    .select("id")
    .single();
  check("A crée un client", !insertError && Boolean(inserted), insertError?.message);

  const clientId = inserted?.id;
  const { data: seen } = await b.client.from("clients").select("id").eq("id", clientId);
  check("B ne voit pas le client de A", seen?.length === 0);

  const { data: updated } = await b.client.from("clients").update({ name: "piraté" }).eq("id", clientId).select("id");
  check("B ne peut pas modifier ni archiver le client de A", (updated?.length ?? 0) === 0);

  const { error: forged } = await b.client.from("clients").insert({ user_id: a.id, name: "faux" });
  check("B ne peut pas créer un client au nom de A", Boolean(forged));

  const { data: otherProfile } = await b.client.from("profiles").select("id").eq("id", a.id);
  check("B ne voit pas le profil de A", otherProfile?.length === 0);

  const bytes = new Uint8Array([1, 2, 3]);
  const { error: foreignUpload } = await b.client.storage
    .from("logos")
    .upload(`${a.id}/pirate.webp`, bytes, { contentType: "image/webp" });
  check("B ne peut pas écrire dans le dossier logo de A", Boolean(foreignUpload));

  const { error: ownUpload } = await a.client.storage
    .from("logos")
    .upload(`${a.id}/test-${stamp}.webp`, bytes, { contentType: "image/webp" });
  check("A peut écrire dans son propre dossier logo", !ownUpload, ownUpload?.message);
  if (!ownUpload) await a.client.storage.from("logos").remove([`${a.id}/test-${stamp}.webp`]);
} catch (error) {
  check("exécution du script", false, String(error?.message ?? error));
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
}

console.log(results.join("\n"));
process.exit(results.some((line) => line.startsWith("FAIL")) ? 1 : 0);

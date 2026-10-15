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

  const { data: foreignRemoved } = await b.client.storage.from("logos").remove([`${a.id}/test-${stamp}.webp`]);
  check("B ne peut pas supprimer le logo de A", (foreignRemoved?.length ?? 0) === 0);

  const { data: removed } = await a.client.storage.from("logos").remove([`${a.id}/test-${stamp}.webp`]);
  check("A peut supprimer son propre logo", removed?.length === 1);
  // ---------- Factures ----------
  const line = (position) => ({ position, description: `Prestation ${position}`, quantity: 1, unit_price: 1000, line_total: 1000 });
  const draftData = (clientId) => ({
    client_id: clientId, due_kind: "30", due_date: "", currency: "XOF", vat_rate: 18, discount_type: "",
    discount_value: "", note: "", subtotal: 1000, discount_amount: 0, vat_amount: 180, total: 1180,
  });

  const { data: draftId, error: draftError } = await a.client.rpc("save_invoice_draft", {
    p_id: null, p_data: draftData(clientId), p_lines: [line(0)],
  });
  check("A enregistre un brouillon", !draftError && Boolean(draftId), draftError?.message);

  const { data: seenInvoice } = await b.client.from("invoices").select("id").eq("id", draftId);
  check("B ne voit pas la facture de A", seenInvoice?.length === 0);

  const { error: foreignIssue } = await b.client.rpc("issue_invoice", { p_id: draftId, p_logo_path: null });
  check("B ne peut pas émettre la facture de A", foreignIssue?.message === "not_found", foreignIssue?.message);

  const { error: foreignClient } = await b.client.rpc("save_invoice_draft", {
    p_id: null, p_data: draftData(clientId), p_lines: [line(0)],
  });
  check("B ne peut pas facturer le client de A", foreignClient?.message === "client_not_found", foreignClient?.message);

  const { error: forgedStatus } = await a.client
    .from("invoices")
    .insert({ currency: "XOF", vat_rate: 18, status: "issued", number: "FAC-1999-0001" });
  check("A ne peut pas insérer une facture déjà émise", Boolean(forgedStatus));

  const { data: number, error: issueError } = await a.client.rpc("issue_invoice", { p_id: draftId, p_logo_path: null });
  check("A émet sa facture", !issueError && /^FAC-\d{4}-0001$/.test(number ?? ""), issueError?.message ?? number);

  const { data: editedIssued } = await a.client.from("invoices").update({ note: "modifiée" }).eq("id", draftId).select("id");
  check("A ne peut pas modifier une facture émise", (editedIssued?.length ?? 0) === 0);

  const { error: editLines } = await a.client.from("invoice_lines").insert({ invoice_id: draftId, position: 9, description: "ajout", quantity: 1, unit_price: 1, line_total: 1 });
  check("A ne peut pas ajouter de ligne à une facture émise", Boolean(editLines));

  const { error: foreignPaid } = await b.client.rpc("mark_invoice_paid", { p_id: draftId, p_paid_at: new Date().toISOString().slice(0, 10), p_method: "wave" });
  check("B ne peut pas marquer payée la facture de A", foreignPaid?.message === "not_found", foreignPaid?.message);

  const ids = [];
  for (let i = 0; i < 10; i++) {
    const { data } = await a.client.rpc("save_invoice_draft", { p_id: null, p_data: draftData(clientId), p_lines: [line(0)] });
    ids.push(data);
  }
  const numbers = await Promise.all(ids.map((id) => a.client.rpc("issue_invoice", { p_id: id, p_logo_path: null })));
  const seqs = numbers.map((r) => Number(r.data?.slice(-4))).sort((x, y) => x - y);
  check("10 émissions simultanées : 0002 à 0011 sans trou ni doublon", seqs.join(",") === "2,3,4,5,6,7,8,9,10,11", seqs.join(","));

  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: anonRead } = await anon.from("invoices").select("id").limit(1);
  check("un visiteur anonyme n’a pas accès aux factures", Boolean(anonRead));
  const site = process.env.CHECK_SITE_URL;
  if (site) {
    const { data: draftForPage } = await a.client.rpc("save_invoice_draft", { p_id: null, p_data: draftData(clientId), p_lines: [line(0)] });
    const { data: tokens } = await a.client.from("invoices").select("id,public_token,status").in("id", [draftId, draftForPage]);
    const issuedToken = tokens.find((t) => t.id === draftId).public_token;
    const draftToken = tokens.find((t) => t.id === draftForPage).public_token;
    check("page publique : facture émise visible", (await fetch(`${site}/f/${issuedToken}`)).status === 200);
    check("page publique : brouillon introuvable", (await fetch(`${site}/f/${draftToken}`)).status === 404);
    check("page publique : faux jeton introuvable", (await fetch(`${site}/f/AAAAAAAAAAAAAAAAAAAAAAAA`)).status === 404);
    const pdf = await fetch(`${site}/f/${issuedToken}/pdf`);
    check("PDF public : application/pdf", pdf.headers.get("content-type") === "application/pdf");
  }
} catch (error) {
  check("exécution du script", false, String(error?.message ?? error));
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id);
}

console.log(results.join("\n"));
process.exit(results.some((line) => line.startsWith("FAIL")) ? 1 : 0);

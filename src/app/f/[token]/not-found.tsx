// src/app/f/[token]/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 text-center text-slate-900">
      <div>
        <h1 className="text-xl font-extrabold">Facture introuvable</h1>
        <p className="mt-2 text-slate-500">Le lien est peut-être incomplet. Demandez-le à nouveau à votre fournisseur.</p>
      </div>
    </div>
  );
}

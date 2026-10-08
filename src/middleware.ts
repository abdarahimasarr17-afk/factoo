import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Limité à l’auth et à l’application : la landing reste statique et sans appel Supabase.
export const config = {
  matcher: ["/app", "/app/:path*", "/connexion", "/inscription", "/inscription/:path*", "/mot-de-passe-oublie"],
};

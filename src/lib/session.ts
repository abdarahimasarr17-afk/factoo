import "server-only";
import { cache } from "react";
import { getProfile } from "@/lib/repos";
import { requireUser } from "@/lib/supabase/server";

// Une seule lecture de l’utilisateur et du profil par requête (layout + page + actions).
export const getSession = cache(async () => {
  const { supabase, user } = await requireUser();
  const profile = await getProfile(supabase, user.id);
  return { supabase, user, profile };
});

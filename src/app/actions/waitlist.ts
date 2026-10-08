"use server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { submitWaitlist, type WaitlistState } from "@/lib/waitlist";

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  return submitWaitlist(formData, async (row) => {
    const { error } = await getSupabaseAdmin().from("waitlist").insert(row);
    return { error };
  });
}

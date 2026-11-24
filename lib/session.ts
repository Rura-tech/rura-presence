import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavState, type NavState } from "@/lib/nav";
import type { Profile } from "@/lib/types";

/**
 * Auth + profil + état de la navigation, partagé par toutes les pages privées.
 * Redirige vers /auth si pas connecté, vers /inscription si le profil manque.
 */
export async function requireProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
  navState: NavState;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/inscription");
  }

  const navState = await getNavState(supabase, profile as Profile);

  return { supabase, profile: profile as Profile, navState };
}

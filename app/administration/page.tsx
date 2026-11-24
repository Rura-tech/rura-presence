import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import AdministrationView from "./AdministrationView";
import type { Profile } from "@/lib/types";

export default async function AdministrationPage() {
  const { supabase, profile, navState } = await requireProfile();

  if (profile.role !== "admin_rh") {
    redirect("/");
  }

  const { data: profils } = await supabase
    .from("profiles")
    .select("*")
    .order("nom");

  return (
    <AdministrationView
      currentProfile={profile}
      navState={navState}
      profils={(profils ?? []) as Profile[]}
    />
  );
}

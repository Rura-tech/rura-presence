import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import ForfaitJoursView from "./ForfaitJoursView";
import type { DeclarationMensuelle } from "@/lib/types";

export default async function ForfaitJoursPage() {
  const { supabase, profile, navState } = await requireProfile();

  if (profile.type_contrat !== "cadre_forfait_jours") {
    // Manager non concerné par le forfait jours : il n'a que la vue équipe.
    redirect(navState.estManager ? "/forfait-jours/equipe" : "/");
  }

  const { data: declarations } = await supabase
    .from("declarations_mensuelles")
    .select("*")
    .eq("user_id", profile.id)
    .order("mois", { ascending: false });

  let managerNom: string | null = null;
  if (profile.manager_id) {
    const { data: manager } = await supabase
      .from("profiles")
      .select("prenom, nom")
      .eq("id", profile.manager_id)
      .single();
    if (manager) managerNom = `${manager.prenom} ${manager.nom}`;
  }

  return (
    <ForfaitJoursView
      currentProfile={profile}
      navState={navState}
      declarations={(declarations ?? []) as DeclarationMensuelle[]}
      managerNom={managerNom}
    />
  );
}

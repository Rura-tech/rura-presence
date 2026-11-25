import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import ForfaitJoursView from "./ForfaitJoursView";
import { moisEnCours } from "@/lib/mois";
import type { DeclarationMensuelle } from "@/lib/types";

export default async function ForfaitJoursPage({
  searchParams,
}: {
  searchParams: { mois?: string };
}) {
  const { supabase, profile, navState } = await requireProfile();

  if (profile.type_contrat !== "cadre_forfait_jours") {
    // Manager non concerné par le forfait jours : il n'a que la vue équipe.
    redirect(navState.estManager ? "/forfait-jours/equipe" : "/");
  }

  const demande = searchParams.mois ?? "";
  const mois = /^\d{4}-\d{2}-01$/.test(demande) && demande <= moisEnCours() ? demande : moisEnCours();

  const [{ data: declaration }, { data: historique }] = await Promise.all([
    supabase
      .from("declarations_mensuelles")
      .select("*, jours_declares(*)")
      .eq("user_id", profile.id)
      .eq("mois", mois)
      .maybeSingle(),
    supabase
      .from("declarations_mensuelles")
      .select("id, mois, jours_travailles, statut, repos_respectes")
      .eq("user_id", profile.id)
      .order("mois", { ascending: false }),
  ]);

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
      mois={mois}
      declaration={(declaration ?? null) as DeclarationMensuelle | null}
      historique={(historique ?? []) as DeclarationMensuelle[]}
      managerNom={managerNom}
    />
  );
}

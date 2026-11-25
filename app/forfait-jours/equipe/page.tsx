import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import EquipeView from "./EquipeView";
import { moisPrecedent } from "@/lib/mois";
import type { DeclarationMensuelle, Profile } from "@/lib/types";

export default async function EquipePage() {
  const { supabase, profile, navState } = await requireProfile();

  if (!navState.estManager) {
    redirect("/");
  }

  const [{ data: declarations }, { data: equipe }] = await Promise.all([
    supabase
      .from("declarations_mensuelles")
      .select("*, profiles!declarations_mensuelles_user_id_fkey(*), jours_declares(*)")
      .eq("manager_id", profile.id)
      .order("mois", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .eq("manager_id", profile.id)
      .order("nom"),
  ]);

  const mois = moisPrecedent();
  const forfaitJours = (equipe ?? []).filter(
    (p: Profile) => p.type_contrat === "cadre_forfait_jours"
  );
  const ontDeclare = new Set(
    (declarations ?? []).filter((d) => d.mois === mois).map((d) => d.user_id)
  );
  const manquants = forfaitJours.filter((p: Profile) => !ontDeclare.has(p.id));

  return (
    <EquipeView
      currentProfile={profile}
      navState={navState}
      declarations={(declarations ?? []) as DeclarationMensuelle[]}
      manquants={manquants as Profile[]}
      moisAttendu={mois}
    />
  );
}

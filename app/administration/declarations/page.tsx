import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/session";
import DeclarationsView from "./DeclarationsView";
import { moisEnCours, PREMIER_MOIS_SUIVI } from "@/lib/mois";
import type { DeclarationMensuelle, Profile } from "@/lib/types";

export default async function DeclarationsAdminPage({
  searchParams,
}: {
  searchParams: { mois?: string };
}) {
  const { supabase, profile, navState } = await requireProfile();

  if (profile.role !== "admin_rh") {
    redirect("/");
  }

  const demande = searchParams.mois ?? "";
  const valide =
    /^\d{4}-\d{2}-01$/.test(demande) &&
    demande <= moisEnCours() &&
    demande >= PREMIER_MOIS_SUIVI;
  const mois = valide ? demande : moisEnCours();

  const [{ data: declarations }, { data: concernes }] = await Promise.all([
    supabase
      .from("declarations_mensuelles")
      .select(
        "*, profiles!declarations_mensuelles_user_id_fkey(*), jours_declares(*), manager:profiles!declarations_mensuelles_manager_id_fkey(prenom, nom)"
      )
      .eq("mois", mois)
      .order("mois", { ascending: false }),
    supabase
      .from("profiles")
      .select("*")
      .eq("type_contrat", "cadre_forfait_jours")
      .order("nom"),
  ]);

  const ontDeclare = new Set((declarations ?? []).map((d) => d.user_id));
  const manquants = (concernes ?? []).filter((p: Profile) => !ontDeclare.has(p.id));

  return (
    <DeclarationsView
      currentProfile={profile}
      navState={navState}
      mois={mois}
      declarations={(declarations ?? []) as DeclarationMensuelle[]}
      manquants={manquants as Profile[]}
      nbConcernes={(concernes ?? []).length}
    />
  );
}

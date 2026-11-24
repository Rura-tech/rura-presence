import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./types";
import { moisPrecedent } from "./mois";

export type Onglet = "presence" | "forfait-jours" | "administration";

export interface NavState {
  /** La personne est au forfait jours : elle doit déclarer tous les mois. */
  forfaitJours: boolean;
  /** Le mois précédent n'a pas encore été déclaré. */
  declarationManquante: boolean;
  /** La personne encadre au moins un salarié au forfait jours. */
  estManager: boolean;
  /** Nombre de déclarations en attente de sa décision. */
  aValider: number;
  /** Droits d'administration RH. */
  administration: boolean;
}

export async function getNavState(
  supabase: SupabaseClient,
  profile: Profile
): Promise<NavState> {
  const forfaitJours = profile.type_contrat === "cadre_forfait_jours";

  const [equipe, aValider, derniereDeclaration] = await Promise.all([
    // Seuls comptent les subordonnés réellement au forfait jours : encadrer
    // des non-cadres ne donne rien à valider, donc pas d'onglet.
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("manager_id", profile.id)
      .eq("type_contrat", "cadre_forfait_jours"),
    supabase
      .from("declarations_mensuelles")
      .select("id", { count: "exact", head: true })
      .eq("manager_id", profile.id)
      .eq("statut", "soumise"),
    forfaitJours
      ? supabase
          .from("declarations_mensuelles")
          .select("id")
          .eq("user_id", profile.id)
          .eq("mois", moisPrecedent())
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    forfaitJours,
    declarationManquante: forfaitJours && !derniereDeclaration.data,
    estManager: (equipe.count ?? 0) > 0,
    aValider: aValider.count ?? 0,
    administration: profile.role === "admin_rh",
  };
}

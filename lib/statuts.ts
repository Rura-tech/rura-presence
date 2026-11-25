export type StatutJour =
  | "jour_travaille"
  | "repos_hebdomadaire"
  | "conges_payes"
  | "conges_supplementaires"
  | "jours_feries_chomes"
  | "jnt"
  | "conges_sans_solde"
  | "conge_exceptionnel"
  | "maladie"
  | "evenement_personnel";

export interface DefinitionStatut {
  id: StatutJour;
  label: string;
  /** Libellé court, pour les cases du calendrier. */
  court: string;
  /** Fond et texte, dans les couleurs de la charte. */
  classe: string;
}

/**
 * Les statuts proposés : les huit du tableur de suivi, dans son ordre, puis les
 * deux absences ajoutées ensuite. Aucun motif n'est demandé au-delà du libellé :
 * le détail reste à la paie.
 */
export const STATUTS_JOUR: DefinitionStatut[] = [
  { id: "jour_travaille",         label: "Jour travaillé",         court: "Travaillé",     classe: "bg-vert text-noir" },
  { id: "repos_hebdomadaire",     label: "Repos hebdomadaire",     court: "Repos hebdo",   classe: "bg-blanc2 text-black60" },
  { id: "conges_payes",           label: "Congés payés",           court: "Congés payés",  classe: "bg-bleu text-noir" },
  { id: "conges_supplementaires", label: "Congés supplémentaires", court: "Congés suppl.", classe: "bg-saumon text-noir" },
  { id: "jours_feries_chomes",    label: "Jours fériés chômés",    court: "Férié",         classe: "bg-gris-disabled text-noir" },
  { id: "jnt",                    label: "JNT / RTT",              court: "JNT / RTT",     classe: "bg-jaune2 text-noir" },
  { id: "conges_sans_solde",      label: "Congés sans solde",      court: "Sans solde",    classe: "bg-orange2 text-noir" },
  { id: "conge_exceptionnel",     label: "Congé exceptionnel",     court: "Exceptionnel",  classe: "bg-orange text-blanc" },
  { id: "maladie",                label: "Maladie",                court: "Maladie",       classe: "bg-noir text-blanc" },
  { id: "evenement_personnel",    label: "Évènement personnel",    court: "Évènement",     classe: "bg-creme text-noir" },
];

export const STATUT_PAR_ID: Record<StatutJour, DefinitionStatut> = Object.fromEntries(
  STATUTS_JOUR.map((s) => [s.id, s])
) as Record<StatutJour, DefinitionStatut>;

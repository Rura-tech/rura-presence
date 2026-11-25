import { feriesFrancais } from "./feries";
import { parseMois } from "./mois";
import { STATUTS_JOUR, type StatutJour } from "./statuts";

export interface JourCalendrier {
  /** « YYYY-MM-DD » */
  date: string;
  numero: number;
  /** 1 = lundi … 7 = dimanche */
  jourSemaine: number;
  estWeekend: boolean;
  /** Nom du jour férié, le cas échéant. */
  ferie: string | null;
}

/** Tous les jours d'un mois, avec week-ends et fériés repérés. */
export function joursDuMois(mois: string): JourCalendrier[] {
  const debut = parseMois(mois);
  const annee = debut.getFullYear();
  const indexMois = debut.getMonth();
  const feries = feriesFrancais(annee);
  const nbJours = new Date(annee, indexMois + 1, 0).getDate();

  return Array.from({ length: nbJours }, (_, i) => {
    const date = new Date(annee, indexMois, i + 1);
    const dimanche0 = date.getDay();
    const jourSemaine = dimanche0 === 0 ? 7 : dimanche0;
    const cle = `${annee}-${String(indexMois + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;

    return {
      date: cle,
      numero: i + 1,
      jourSemaine,
      estWeekend: jourSemaine >= 6,
      ferie: feries.get(cle) ?? null,
    };
  });
}

/**
 * Pré-remplissage : uniquement les week-ends en repos hebdomadaire et les fériés
 * en semaine en jours fériés chômés. Les autres jours restent à renseigner par le
 * salarié. Le week-end l'emporte sur le férié, comme dans le tableur de suivi.
 */
export function statutsParDefaut(mois: string): Record<string, StatutJour> {
  const resultat: Record<string, StatutJour> = {};
  for (const jour of joursDuMois(mois)) {
    if (jour.estWeekend) resultat[jour.date] = "repos_hebdomadaire";
    else if (jour.ferie) resultat[jour.date] = "jours_feries_chomes";
  }
  return resultat;
}

/** Nombre de jours par statut, plus les non renseignés et le total. */
export function recapitulatif(
  mois: string,
  statuts: Record<string, StatutJour | undefined>
): { parStatut: Record<StatutJour, number>; nonRenseigne: number; total: number } {
  const jours = joursDuMois(mois);
  // Dérivé de la liste des statuts : un statut ajouté ne peut pas être oublié ici.
  const parStatut = Object.fromEntries(
    STATUTS_JOUR.map((s) => [s.id, 0])
  ) as Record<StatutJour, number>;

  let nonRenseigne = 0;
  for (const jour of jours) {
    const statut = statuts[jour.date];
    if (statut) parStatut[statut] += 1;
    else nonRenseigne += 1;
  }

  return { parStatut, nonRenseigne, total: jours.length };
}

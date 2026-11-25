import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Le suivi du forfait jours démarre en juin 2026 : rien avant n'est déclarable. */
export const PREMIER_MOIS_SUIVI = "2026-06-01";

/** "2026-11-01" -> Date locale (évite le décalage de fuseau de new Date("…")). */
export function parseMois(mois: string): Date {
  const [annee, m] = mois.split("-").map(Number);
  return new Date(annee, m - 1, 1);
}

/** Date -> "2026-11-01" */
export function moisStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/** "2026-11-01" -> "novembre 2026" */
export function libelleMois(mois: string): string {
  return format(parseMois(mois), "MMMM yyyy", { locale: fr });
}

/** Les n derniers mois, du plus récent au plus ancien, mois en cours inclus. */
export function derniersMois(n: number): string[] {
  const aujourdhui = new Date();
  return Array.from({ length: n }, (_, i) =>
    moisStr(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - i, 1))
  );
}

/** Le mois en cours, au format "2026-11-01". */
export function moisEnCours(): string {
  return moisStr(new Date());
}

/** Le mois précédent, au format "2026-10-01". */
export function moisPrecedent(): string {
  const d = new Date();
  return moisStr(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

/** Les mois déclarables : de juin 2026 au mois en cours, du plus récent au plus ancien. */
export function moisDeclarables(): string[] {
  return derniersMois(36).filter((m) => m >= PREMIER_MOIS_SUIVI);
}

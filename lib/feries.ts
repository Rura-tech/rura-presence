/** Dimanche de Pâques (algorithme de Meeus/Jones/Butcher), en heure locale. */
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

function decale(depart: Date, jours: number): Date {
  return new Date(depart.getFullYear(), depart.getMonth(), depart.getDate() + jours);
}

function cle(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/** Les onze jours fériés français d'une année, par date « YYYY-MM-DD ». */
export function feriesFrancais(annee: number): Map<string, string> {
  const dimanchePaques = paques(annee);

  const jours: [string, Date][] = [
    ["Jour de l'An", new Date(annee, 0, 1)],
    ["Lundi de Pâques", decale(dimanchePaques, 1)],
    ["Fête du Travail", new Date(annee, 4, 1)],
    ["Victoire 1945", new Date(annee, 4, 8)],
    ["Ascension", decale(dimanchePaques, 39)],
    ["Lundi de Pentecôte", decale(dimanchePaques, 50)],
    ["Fête nationale", new Date(annee, 6, 14)],
    ["Assomption", new Date(annee, 7, 15)],
    ["Toussaint", new Date(annee, 10, 1)],
    ["Armistice 1918", new Date(annee, 10, 11)],
    ["Noël", new Date(annee, 11, 25)],
  ];

  return new Map(jours.map(([nom, date]) => [cle(date), nom]));
}

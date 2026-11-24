import type { ChargeRessentie, StatutDeclaration } from "@/lib/types";
import { LIBELLES_CHARGE, LIBELLES_STATUT } from "@/lib/types";

const STYLES_CHARGE: Record<ChargeRessentie, string> = {
  sous_charge: "bg-bleu text-noir",
  normale: "bg-vert/30 text-noir",
  surcharge: "bg-rouge/10 text-rouge",
};

const STYLES_STATUT: Record<StatutDeclaration, string> = {
  soumise: "bg-jaune2/25 text-noir",
  validee: "bg-vert/30 text-noir",
  echange_demande: "bg-orange/10 text-orange",
};

export function ChargeBadge({ charge }: { charge: ChargeRessentie }) {
  return (
    <span className={`type-p14 font-medium px-2 py-0.5 rounded-champ ${STYLES_CHARGE[charge]}`}>
      {LIBELLES_CHARGE[charge]}
    </span>
  );
}

export function StatutBadge({ statut }: { statut: StatutDeclaration }) {
  return (
    <span className={`type-p14 font-medium px-2 py-0.5 rounded-champ ${STYLES_STATUT[statut]}`}>
      {LIBELLES_STATUT[statut]}
    </span>
  );
}

export function ReposBadge({ respectes }: { respectes: boolean }) {
  return (
    <span
      className={`type-p14 font-medium px-2 py-0.5 rounded-champ ${
        respectes ? "bg-blanc2 text-black60" : "bg-rouge/10 text-rouge"
      }`}
    >
      {respectes ? "Repos respectés" : "Repos non respectés"}
    </span>
  );
}

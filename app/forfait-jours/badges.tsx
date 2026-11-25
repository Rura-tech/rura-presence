import type { StatutDeclaration } from "@/lib/types";
import { LIBELLES_STATUT } from "@/lib/types";

const STYLES_STATUT: Record<StatutDeclaration, string> = {
  soumise: "bg-jaune2/25 text-noir",
  validee: "bg-vert/30 text-noir",
  echange_demande: "bg-orange/10 text-orange",
};

export function StatutBadge({ statut }: { statut: StatutDeclaration }) {
  return (
    <span className={`type-p14 px-2 py-0.5 rounded-champ ${STYLES_STATUT[statut]}`}>
      {LIBELLES_STATUT[statut]}
    </span>
  );
}

export function ReposBadge({ respectes }: { respectes: boolean }) {
  return (
    <span
      className={`type-p14 px-2 py-0.5 rounded-champ ${
        respectes ? "bg-blanc2 text-black60" : "bg-rouge/10 text-rouge"
      }`}
    >
      {respectes ? "Repos respectés" : "Repos non respectés"}
    </span>
  );
}

export function DifficulteBadge({ difficulte }: { difficulte: boolean }) {
  if (!difficulte) return null;
  return (
    <span className="type-p14 px-2 py-0.5 rounded-champ bg-orange/10 text-orange">
      Difficulté signalée
    </span>
  );
}

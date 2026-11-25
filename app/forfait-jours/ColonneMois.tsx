"use client";

import Link from "next/link";
import { libelleMois, moisDeclarables } from "@/lib/mois";
import type { DeclarationMensuelle } from "@/lib/types";

interface Props {
  moisActif: string;
  historique: DeclarationMensuelle[];
  /** Base du lien, par exemple "/forfait-jours". */
  base: string;
}

const PASTILLE: Record<string, string> = {
  validee: "bg-vert",
  soumise: "bg-jaune2",
  echange_demande: "bg-orange",
};

export default function ColonneMois({ moisActif, historique, base }: Props) {
  const parMois = new Map(historique.map((d) => [d.mois, d]));
  const mois = moisDeclarables();

  return (
    <nav aria-label="Mes mois">
      {/* Mobile : bande horizontale. Desktop : colonne. */}
      <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
        {mois.map((m) => {
          const declaration = parMois.get(m);
          const actif = m === moisActif;

          return (
            <li key={m} className="shrink-0 lg:shrink">
              <Link
                href={`${base}?mois=${m}`}
                aria-current={actif ? "page" : undefined}
                className={`block rounded-carte px-3 py-2 transition-colors border-l-2 ${
                  actif
                    ? "bg-creme border-orange"
                    : "border-transparent hover:bg-creme"
                }`}
              >
                <span
                  className={`block type-p14 capitalize whitespace-nowrap ${
                    actif ? "font-bold text-noir" : "text-noir"
                  }`}
                >
                  {libelleMois(m)}
                </span>

                <span className="flex items-center gap-1.5 mt-0.5">
                  {declaration ? (
                    <>
                      <span
                        className={`w-1.5 h-1.5 rounded-rond shrink-0 ${
                          PASTILLE[declaration.statut] ?? "bg-black60"
                        }`}
                      />
                      <span className="type-p14 text-black60 whitespace-nowrap">
                        {declaration.jours_travailles} j travaillés
                      </span>
                    </>
                  ) : (
                    <span className="type-p14 text-orange whitespace-nowrap">À déclarer</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

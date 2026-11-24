"use client";

import Link from "next/link";
import type { NavState } from "@/lib/nav";

/**
 * Bascule interne à l'onglet « Forfait jours ».
 * Ne s'affiche que si la personne a réellement deux vues : sa déclaration
 * (forfait jours) et celles de son équipe (manager).
 */
export default function SousNav({
  navState,
  actif,
}: {
  navState: NavState;
  actif: "declaration" | "equipe";
}) {
  if (!navState.forfaitJours || !navState.estManager) return null;

  const entrees = [
    { id: "declaration" as const, href: "/forfait-jours", label: "Ma déclaration" },
    { id: "equipe" as const, href: "/forfait-jours/equipe", label: "Mon équipe" },
  ];

  return (
    <div className="inline-flex items-center bg-creme rounded-carte p-1 mb-6">
      {entrees.map((entree) => (
        <Link
          key={entree.id}
          href={entree.href}
          className={`px-3 py-1.5 rounded-champ type-p14 transition-colors flex items-center gap-1.5 ${
            actif === entree.id
              ? "bg-blanc text-noir ring-1 ring-contour"
              : "text-black60 hover:text-noir"
          }`}
        >
          {entree.label}
          {entree.id === "equipe" && navState.aValider > 0 && (
            <span className="bg-orange text-blanc text-[10px] font-bold leading-none rounded-rond min-w-[16px] h-4 px-1 flex items-center justify-center">
              {navState.aValider}
            </span>
          )}
          {entree.id === "declaration" && navState.declarationManquante && (
            <span className="w-1.5 h-1.5 rounded-rond bg-orange" aria-label="Déclaration à faire" />
          )}
        </Link>
      ))}
    </div>
  );
}

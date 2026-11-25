"use client";

import Link from "next/link";

export default function SousNavAdmin({ actif }: { actif: "salaries" | "declarations" }) {
  const entrees = [
    { id: "salaries" as const, href: "/administration", label: "Salariés" },
    { id: "declarations" as const, href: "/administration/declarations", label: "Déclarations" },
  ];

  return (
    <div className="inline-flex items-center bg-creme rounded-carte p-1 mb-6">
      {entrees.map((entree) => (
        <Link
          key={entree.id}
          href={entree.href}
          className={`px-3 py-1.5 rounded-champ type-p14 transition-colors ${
            actif === entree.id
              ? "bg-blanc text-noir ring-1 ring-contour"
              : "text-black60 hover:text-noir"
          }`}
        >
          {entree.label}
        </Link>
      ))}
    </div>
  );
}

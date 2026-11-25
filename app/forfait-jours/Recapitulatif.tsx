"use client";

import { recapitulatif } from "@/lib/calendrier";
import { STATUTS_JOUR, type StatutJour } from "@/lib/statuts";

export default function Recapitulatif({
  mois,
  statuts,
}: {
  mois: string;
  statuts: Record<string, StatutJour | undefined>;
}) {
  const { parStatut, nonRenseigne, total } = recapitulatif(mois, statuts);

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-contour text-left">
            <th className="px-3 py-2 type-overline text-black60">Récapitulatif</th>
            <th className="px-3 py-2 type-overline text-black60 text-right">Nb jours</th>
          </tr>
        </thead>
        <tbody>
          {STATUTS_JOUR.map((statut) => (
            <tr key={statut.id} className="border-b border-contour">
              <td className="px-3 py-1.5">
                <span className={`inline-block rounded-champ px-1.5 py-0.5 type-p14 ${statut.classe}`}>
                  {statut.label}
                </span>
              </td>
              <td className="px-3 py-1.5 type-p14 text-right font-bold text-noir">
                {parStatut[statut.id]}
              </td>
            </tr>
          ))}
          <tr className="border-b border-contour">
            <td className="px-3 py-1.5 type-p14 italic text-black60">Non renseigné</td>
            <td className="px-3 py-1.5 type-p14 text-right text-black60">{nonRenseigne}</td>
          </tr>
          <tr>
            <td className="px-3 py-2 type-p14 font-bold text-noir">Total</td>
            <td className="px-3 py-2 type-p14 text-right font-bold text-noir">{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

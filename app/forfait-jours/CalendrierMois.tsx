"use client";

import { joursDuMois } from "@/lib/calendrier";
import { STATUT_PAR_ID, type StatutJour } from "@/lib/statuts";

const ENTETES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface Props {
  mois: string;
  statuts: Record<string, StatutJour | undefined>;
  /** Absent = lecture seule. */
  onJourClick?: (date: string) => void;
  compact?: boolean;
}

export default function CalendrierMois({ mois, statuts, onJourClick, compact }: Props) {
  const jours = joursDuMois(mois);
  const decalage = jours[0].jourSemaine - 1;
  const modifiable = Boolean(onJourClick);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-contour">
        {ENTETES.map((entete) => (
          <div
            key={entete}
            className="py-2 text-center type-overline tracking-[1px] sm:tracking-[5px] text-black60"
          >
            <span className="sm:hidden">{entete[0]}</span>
            <span className="hidden sm:inline">{entete}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: decalage }, (_, i) => (
          <div key={`vide-${i}`} className="border-r border-b border-contour last:border-r-0" />
        ))}

        {jours.map((jour) => {
          const statut = statuts[jour.date];
          const definition = statut ? STATUT_PAR_ID[statut] : null;
          const Case = modifiable ? "button" : "div";

          return (
            <Case
              key={jour.date}
              {...(modifiable ? { onClick: () => onJourClick!(jour.date), type: "button" as const } : {})}
              title={jour.ferie ?? undefined}
              className={`border-r border-b border-contour last:border-r-0 text-left p-1 sm:p-1.5 ${
                compact ? "min-h-[44px] sm:min-h-[52px]" : "min-h-[48px] sm:min-h-[72px]"
              } ${modifiable ? "hover:ring-2 hover:ring-orange hover:ring-inset transition-shadow" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-1">
                <span className="type-p14 font-bold text-noir">{jour.numero}</span>
                {jour.ferie && (
                  <span className="type-overline text-black60 truncate" aria-hidden>
                    F
                  </span>
                )}
              </div>

              {definition ? (
                <span
                  className={`mt-1 block rounded-champ text-center leading-tight h-2 sm:h-auto sm:px-1 sm:py-0.5 ${definition.classe}`}
                  style={{ fontSize: "10px" }}
                  title={definition.label}
                >
                  <span className="hidden sm:inline">{definition.court}</span>
                </span>
              ) : (
                <span
                  className="mt-1 block rounded-champ text-center leading-tight text-black60 border border-dashed border-gris-disabled h-2 sm:h-auto sm:px-1 sm:py-0.5"
                  style={{ fontSize: "10px" }}
                >
                  <span className="hidden sm:inline">{modifiable ? "À remplir" : "—"}</span>
                </span>
              )}
            </Case>
          );
        })}
      </div>
    </div>
  );
}

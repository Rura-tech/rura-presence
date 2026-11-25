"use client";

import { useState } from "react";
import Link from "next/link";
import NavBar from "../../NavBar";
import SousNavAdmin from "../SousNavAdmin";
import CalendrierMois from "../../forfait-jours/CalendrierMois";
import Recapitulatif from "../../forfait-jours/Recapitulatif";
import { DifficulteBadge, ReposBadge, StatutBadge } from "../../forfait-jours/badges";
import { libelleMois, moisEnCours, moisStr, parseMois, PREMIER_MOIS_SUIVI } from "@/lib/mois";
import type { NavState } from "@/lib/nav";
import type { DeclarationMensuelle, Profile } from "@/lib/types";

interface Props {
  currentProfile: Profile;
  navState: NavState;
  mois: string;
  declarations: DeclarationMensuelle[];
  manquants: Profile[];
  nbConcernes: number;
}

function moisDecale(mois: string, pas: number): string {
  const d = parseMois(mois);
  return moisStr(new Date(d.getFullYear(), d.getMonth() + pas, 1));
}

export default function DeclarationsView({
  currentProfile,
  navState,
  mois,
  declarations,
  manquants,
  nbConcernes,
}: Props) {
  const [detailOuvert, setDetailOuvert] = useState<string | null>(null);
  const estMoisCourant = mois === moisEnCours();
  const estPremierMois = mois === PREMIER_MOIS_SUIVI;

  return (
    <div className="min-h-screen bg-blanc">
      <NavBar currentProfile={currentProfile} activeTab="administration" navState={navState} />

      <main className="max-w-6xl mx-auto px-4 sm:px-2 py-6">
        <SousNavAdmin actif="declarations" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="type-h3 text-noir">Déclarations</h2>
            <p className="type-p14 text-black60 mt-0.5">
              {declarations.length} déclaration{declarations.length > 1 ? "s" : ""} sur{" "}
              {nbConcernes} personne{nbConcernes > 1 ? "s" : ""} au forfait jours.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {estPremierMois ? (
              <span className="btn-secondary p-2.5 text-black60 cursor-not-allowed" aria-disabled>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
            ) : (
              <Link
                href={`/administration/declarations?mois=${moisDecale(mois, -1)}`}
                className="btn-secondary p-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <span className="type-p14 font-bold text-noir capitalize min-w-[8rem] text-center">
              {libelleMois(mois)}
            </span>
            {estMoisCourant ? (
              <span className="btn-secondary p-2.5 text-black60 cursor-not-allowed" aria-disabled>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            ) : (
              <Link
                href={`/administration/declarations?mois=${moisDecale(mois, 1)}`}
                className="btn-secondary p-2.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {declarations.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="type-p14 text-black60">Aucune déclaration pour ce mois.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {declarations.map((d) => {
              const statuts = Object.fromEntries(
                (d.jours_declares ?? []).map((j) => [j.jour, j.statut])
              );
              const manager = (d as unknown as { manager?: { prenom: string; nom: string } }).manager;

              return (
                <li key={d.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="type-p14 font-bold text-noir">
                      {d.profiles?.prenom} {d.profiles?.nom}
                    </span>
                    <span className="type-p14 text-black60">{d.jours_travailles} jours travaillés</span>
                    <ReposBadge respectes={d.repos_respectes} />
                    <DifficulteBadge difficulte={d.difficulte} />
                    <span className="ml-auto flex items-center gap-2">
                      {manager && (
                        <span className="type-p14 text-black60">
                          N+1 : {manager.prenom} {manager.nom}
                        </span>
                      )}
                      <StatutBadge statut={d.statut} />
                    </span>
                  </div>

                  {d.commentaire && (
                    <p className="type-p14 text-black60 mt-2 italic">{d.commentaire}</p>
                  )}
                  {d.commentaire_manager && (
                    <p className="type-p14 text-orange mt-2">
                      Manager : {d.commentaire_manager}
                    </p>
                  )}

                  <button
                    onClick={() => setDetailOuvert(detailOuvert === d.id ? null : d.id)}
                    className="type-p14 text-orange hover:underline mt-3"
                  >
                    {detailOuvert === d.id ? "Masquer le détail des jours" : "Voir le détail des jours"}
                  </button>

                  {detailOuvert === d.id && (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] items-start mt-3">
                      <CalendrierMois mois={d.mois} statuts={statuts} compact />
                      <Recapitulatif mois={d.mois} statuts={statuts} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {manquants.length > 0 && (
          <section className="mt-8">
            <h3 className="type-h4 text-noir mb-3">N&apos;ont pas déclaré ce mois</h3>
            <div className="card p-4">
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {manquants.map((p) => (
                  <li key={p.id} className="type-p14 text-black60">
                    {p.prenom} {p.nom}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

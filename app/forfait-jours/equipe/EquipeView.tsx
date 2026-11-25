"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "../../NavBar";
import { DifficulteBadge, ReposBadge, StatutBadge } from "../badges";
import CalendrierMois from "../CalendrierMois";
import Recapitulatif from "../Recapitulatif";
import SousNav from "../SousNav";
import type { NavState } from "@/lib/nav";
import type { DeclarationMensuelle, Profile } from "@/lib/types";
import { libelleMois } from "@/lib/mois";

interface Props {
  currentProfile: Profile;
  navState: NavState;
  declarations: DeclarationMensuelle[];
  manquants: Profile[];
  moisAttendu: string;
}

export default function EquipeView({
  currentProfile,
  navState,
  declarations,
  manquants,
  moisAttendu,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [traitement, setTraitement] = useState<string | null>(null);
  const [echangePour, setEchangePour] = useState<string | null>(null);
  const [messageEchange, setMessageEchange] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [detailOuvert, setDetailOuvert] = useState<string | null>(null);

  const aValider = declarations.filter((d) => d.statut === "soumise");
  const historique = declarations.filter((d) => d.statut !== "soumise");

  async function decider(
    declaration: DeclarationMensuelle,
    statut: "validee" | "echange_demande",
    message?: string
  ) {
    setTraitement(declaration.id);
    setErreur(null);
    try {
      const { error } = await supabase
        .from("declarations_mensuelles")
        .update({
          statut,
          commentaire_manager: message?.trim() || null,
        })
        .eq("id", declaration.id);

      if (error) {
        setErreur(error.message);
        return;
      }

      setEchangePour(null);
      setMessageEchange("");
      router.refresh();
    } finally {
      setTraitement(null);
    }
  }

  function detailJours(d: DeclarationMensuelle) {
    const statuts = Object.fromEntries(
      (d.jours_declares ?? []).map((j) => [j.jour, j.statut])
    );

    return (
      <div className="mt-3">
        <button
          onClick={() => setDetailOuvert(detailOuvert === d.id ? null : d.id)}
          className="type-p14 text-orange hover:underline"
        >
          {detailOuvert === d.id ? "Masquer le détail des jours" : "Voir le détail des jours"}
        </button>

        {detailOuvert === d.id && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] items-start mt-3">
            <CalendrierMois mois={d.mois} statuts={statuts} compact />
            <Recapitulatif mois={d.mois} statuts={statuts} />
          </div>
        )}
      </div>
    );
  }

  function nomDe(d: DeclarationMensuelle) {
    return d.profiles ? `${d.profiles.prenom} ${d.profiles.nom}` : "Salarié";
  }

  return (
    <div className="min-h-screen bg-blanc">
      <NavBar currentProfile={currentProfile} activeTab="forfait-jours" navState={navState} />

      <main className="max-w-6xl mx-auto px-4 sm:px-2 py-6">
        <SousNav navState={navState} actif="equipe" />

        <div className="mb-6">
          <h2 className="type-h3 text-noir">Mon équipe</h2>
          <p className="type-p14 text-black60 mt-0.5">
            Déclarations de forfait jours des personnes que vous encadrez.
          </p>
        </div>

        {erreur && (
          <p className="type-p14 text-rouge mb-4" role="alert">
            {erreur}
          </p>
        )}

        {/* ─── À valider ──────────────────────────────────────────── */}
        <section className="mb-8">
          <h3 className="type-h4 text-noir mb-3">
            À valider{" "}
            {aValider.length > 0 && (
              <span className="text-orange">({aValider.length})</span>
            )}
          </h3>

          {aValider.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="type-p14 text-black60">Rien en attente. Tout est à jour.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {aValider.map((d) => (
                <li key={d.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                    <span className="type-p14 font-semibold text-noir">{nomDe(d)}</span>
                    <span className="type-p14 text-black60 capitalize">
                      {libelleMois(d.mois)}
                    </span>
                    <span className="type-p14 text-black60">
                      {d.jours_travailles} jour{d.jours_travailles > 1 ? "s" : ""}
                    </span>
                    <ReposBadge respectes={d.repos_respectes} />
                    <DifficulteBadge difficulte={d.difficulte} />
                  </div>

                  {d.commentaire && (
                    <p className="type-p14 text-black60 italic mb-3">{d.commentaire}</p>
                  )}

                  {(!d.repos_respectes || d.difficulte) && (
                    <div className="flex items-start gap-1.5 bg-jaune2/20 border border-jaune2 text-noir type-p14 rounded-carte px-2.5 py-1.5 mb-3">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Ce mois appelle un échange :{" "}
                      {d.difficulte ? "une difficulté est signalée" : ""}
                      {d.difficulte && !d.repos_respectes ? " et " : ""}
                      {!d.repos_respectes ? "les temps de repos n'ont pas été respectés" : ""}.
                    </div>
                  )}

                  {detailJours(d)}

                  {echangePour === d.id ? (
                    <div>
                      <textarea
                        value={messageEchange}
                        onChange={(e) => setMessageEchange(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="Ce que vous souhaitez aborder avec cette personne…"
                        className="input-field mb-2 resize-y"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => decider(d, "echange_demande", messageEchange)}
                          disabled={traitement === d.id}
                          className="btn-primary"
                        >
                          {traitement === d.id ? "…" : "Envoyer la demande"}
                        </button>
                        <button
                          onClick={() => {
                            setEchangePour(null);
                            setMessageEchange("");
                          }}
                          className="btn-secondary"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => decider(d, "validee")}
                        disabled={traitement === d.id}
                        className="btn-primary"
                      >
                        {traitement === d.id ? "…" : "Valider"}
                      </button>
                      <button
                        onClick={() => setEchangePour(d.id)}
                        disabled={traitement === d.id}
                        className="btn-secondary"
                      >
                        Demander un échange
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ─── Déclarations manquantes ────────────────────────────── */}
        {manquants.length > 0 && (
          <section className="mb-8">
            <h3 className="type-h4 text-noir mb-3">
              N&apos;ont pas déclaré <span className="capitalize">{libelleMois(moisAttendu)}</span>
            </h3>
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

        {/* ─── Historique ─────────────────────────────────────────── */}
        <section>
          <h3 className="type-h4 text-noir mb-3">Historique de l&apos;équipe</h3>

          {historique.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="type-p14 text-black60">Aucune déclaration traitée pour l&apos;instant.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {historique.map((d) => (
                <li key={d.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="type-p14 font-semibold text-noir">{nomDe(d)}</span>
                    <span className="type-p14 text-black60 capitalize">
                      {libelleMois(d.mois)}
                    </span>
                    <span className="type-p14 text-black60">
                      {d.jours_travailles} jour{d.jours_travailles > 1 ? "s" : ""}
                    </span>
                    <ReposBadge respectes={d.repos_respectes} />
                    <DifficulteBadge difficulte={d.difficulte} />
                    <span className="ml-auto">
                      <StatutBadge statut={d.statut} />
                    </span>
                  </div>
                  {d.commentaire && (
                    <p className="type-p14 text-black60 mt-2 italic">{d.commentaire}</p>
                  )}
                  {d.commentaire_manager && (
                    <p className="type-p14 text-orange mt-2">Vous : {d.commentaire_manager}</p>
                  )}
                  {detailJours(d)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

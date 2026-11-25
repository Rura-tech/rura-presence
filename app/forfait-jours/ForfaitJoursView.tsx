"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import NavBar from "../NavBar";
import SousNav from "./SousNav";
import ColonneMois from "./ColonneMois";
import CalendrierMois from "./CalendrierMois";
import Recapitulatif from "./Recapitulatif";
import { StatutBadge } from "./badges";
import { joursDuMois, statutsParDefaut } from "@/lib/calendrier";
import { libelleMois } from "@/lib/mois";
import { STATUTS_JOUR, type StatutJour } from "@/lib/statuts";
import type { NavState } from "@/lib/nav";
import type { DeclarationMensuelle, Profile } from "@/lib/types";

interface Props {
  currentProfile: Profile;
  navState: NavState;
  mois: string;
  declaration: DeclarationMensuelle | null;
  historique: DeclarationMensuelle[];
  managerNom: string | null;
}

type Statuts = Record<string, StatutJour | undefined>;

export default function ForfaitJoursView({
  currentProfile,
  navState,
  mois,
  declaration,
  historique,
  managerNom,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const sansValidation = !currentProfile.manager_id;
  const modifiable = !declaration || declaration.statut !== "validee" || sansValidation;

  // Les jours enregistrés font foi ; à défaut, week-ends et fériés pré-remplis.
  const statutsInitiaux = useMemo<Statuts>(() => {
    const defauts: Statuts = statutsParDefaut(mois);
    for (const jour of declaration?.jours_declares ?? []) {
      defauts[jour.jour] = jour.statut;
    }
    return defauts;
  }, [mois, declaration]);

  const [statuts, setStatuts] = useState<Statuts>(statutsInitiaux);
  const [jourOuvert, setJourOuvert] = useState<string | null>(null);
  const [repos, setRepos] = useState<boolean | null>(declaration?.repos_respectes ?? null);
  const [difficulte, setDifficulte] = useState<boolean | null>(declaration?.difficulte ?? null);
  const [commentaire, setCommentaire] = useState(declaration?.commentaire ?? "");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    setStatuts(statutsInitiaux);
    setRepos(declaration?.repos_respectes ?? null);
    setDifficulte(declaration?.difficulte ?? null);
    setCommentaire(declaration?.commentaire ?? "");
    setErreur(null);
    setSucces(false);
  }, [statutsInitiaux, declaration]);

  const restants = joursDuMois(mois).filter((j) => !statuts[j.date]).length;

  function choisirStatut(date: string, statut: StatutJour) {
    setStatuts((actuels) => ({ ...actuels, [date]: statut }));
    setJourOuvert(null);
    setSucces(false);
  }

  async function enregistrer() {
    setErreur(null);
    setSucces(false);

    if (restants > 0) {
      setErreur(
        `Il reste ${restants} jour${restants > 1 ? "s" : ""} à renseigner dans le calendrier.`
      );
      return;
    }
    if (difficulte === null) {
      setErreur("Indiquez si vous avez une difficulté à déclarer ce mois-ci.");
      return;
    }
    if (repos === null) {
      setErreur("Indiquez si vous avez pu respecter les heures de repos.");
      return;
    }

    setEnregistrement(true);
    try {
      let declarationId = declaration?.id ?? null;

      if (!declarationId) {
        const { data, error } = await supabase
          .from("declarations_mensuelles")
          .insert({
            user_id: currentProfile.id,
            mois,
            jours_travailles: 0, // recalculé par la base à partir du détail
            repos_respectes: repos,
            difficulte,
            commentaire: commentaire.trim() || null,
          })
          .select("id")
          .single();

        if (error || !data) {
          setErreur(error?.message ?? "Enregistrement impossible.");
          return;
        }
        declarationId = data.id;
      } else {
        const { error } = await supabase
          .from("declarations_mensuelles")
          .update({
            repos_respectes: repos,
            difficulte,
            commentaire: commentaire.trim() || null,
          })
          .eq("id", declarationId);

        if (error) {
          setErreur(error.message);
          return;
        }
      }

      const lignes = Object.entries(statuts)
        .filter(([, statut]) => Boolean(statut))
        .map(([jour, statut]) => ({ declaration_id: declarationId, jour, statut }));

      const { error } = await supabase
        .from("jours_declares")
        .upsert(lignes, { onConflict: "declaration_id,jour" });

      if (error) {
        setErreur(error.message);
        return;
      }

      // Horodaté en dernier, une fois le détail écrit : c'est ce passage qui
      // déclenche l'alerte au N+1, avec le bon nombre de jours travaillés.
      const { error: erreurEnvoi } = await supabase
        .from("declarations_mensuelles")
        .update({ envoyee_at: new Date().toISOString() })
        .eq("id", declarationId);

      if (erreurEnvoi) {
        setErreur(erreurEnvoi.message);
        return;
      }

      setSucces(true);
      router.refresh();
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div className="min-h-screen bg-blanc">
      <NavBar currentProfile={currentProfile} activeTab="forfait-jours" navState={navState} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <SousNav navState={navState} actif="declaration" />

        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-5">
          <div>
            <h2 className="type-h3 text-noir">Suivi du forfait jours</h2>
            <p className="type-p14 text-black60 mt-0.5">
              {managerNom
                ? `Indiquez le statut de chaque jour, puis envoyez à ${managerNom}.`
                : "Indiquez le statut de chaque jour. Vous n'avez pas de N+1 : votre déclaration est enregistrée sans validation."}
            </p>
          </div>
          {declaration && <StatutBadge statut={declaration.statut} />}
        </div>

        <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] items-start">
          {/* Les mois, toujours sous la main */}
          {/* min-w-0 : sans lui, la bande de mois élargit la colonne au lieu de défiler */}
          <aside className="min-w-0 lg:sticky lg:top-20">
            <h3 className="type-overline text-black60 mb-2 lg:px-3">Mes mois</h3>
            <ColonneMois moisActif={mois} historique={historique} base="/forfait-jours" />
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h3 className="type-h4 text-noir capitalize">{libelleMois(mois)}</h3>
              {modifiable && (
                <p className={`type-p14 ${restants > 0 ? "text-orange" : "text-black60"}`}>
                  {restants > 0
                    ? `${restants} jour${restants > 1 ? "s" : ""} à renseigner`
                    : "Tous les jours sont renseignés"}
                </p>
              )}
            </div>

            {declaration?.commentaire_manager && (
              <div className="bg-orange/5 ring-1 ring-orange/20 rounded-carte p-3 mb-4">
                <p className="type-p14 font-bold text-orange mb-1">
                  Message de {managerNom ?? "votre manager"}
                </p>
                <p className="type-p14 text-noir">{declaration.commentaire_manager}</p>
              </div>
            )}

            {!modifiable && (
              <p className="type-p14 text-black60 mb-4">
                Ce mois est validé : il n&apos;est plus modifiable. Demandez à{" "}
                {managerNom ?? "votre manager"} de rouvrir la déclaration si besoin.
              </p>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] items-start">
              <div>
                <CalendrierMois
                  mois={mois}
                  statuts={statuts}
                  onJourClick={modifiable ? (date) => setJourOuvert(date) : undefined}
                />
                <p className="type-p14 text-black60 mt-2">
                  Week-ends et jours fériés sont renseignés automatiquement. Touchez un jour
                  pour lui donner un statut.
                </p>
              </div>

              <div className="space-y-5">
                <Recapitulatif mois={mois} statuts={statuts} />

                {/* Les deux questions du suivi, dans l'ordre du tableur */}
                <div className="card p-4 space-y-4">
                  <div>
                    <p className="type-p14 font-bold text-noir mb-2">
                      Avez-vous une difficulté à déclarer ce mois-ci ?
                    </p>
                    <OuiNon valeur={difficulte} onChange={setDifficulte} desactive={!modifiable} />
                  </div>

                  <div>
                    <p className="type-p14 font-bold text-noir mb-1.5">
                      Avez-vous pu respecter les heures de repos entre chaque jour travaillé ?
                    </p>
                    <p className="type-p14 text-black60 mb-2">
                      Repos quotidien de 11 h et repos hebdomadaire de 35 h consécutives.
                    </p>
                    <OuiNon valeur={repos} onChange={setRepos} desactive={!modifiable} />
                  </div>

                  <div>
                    <p className="type-p14 font-bold text-noir mb-2">
                      Commentaire <span className="font-normal text-black60">(facultatif)</span>
                    </p>
                    <textarea
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      rows={3}
                      disabled={!modifiable}
                      placeholder="Un point à signaler sur ce mois ?"
                      className="input-field resize-y"
                    />
                  </div>
                </div>

                {erreur && (
                  <p className="type-p14 text-rouge" role="alert">
                    {erreur}
                  </p>
                )}
                {succes && (
                  <p className="type-p14 text-black60">
                    {sansValidation ? "Déclaration enregistrée." : "Déclaration envoyée."}
                  </p>
                )}

                {modifiable && (
                  <button onClick={enregistrer} disabled={enregistrement} className="btn-primary w-full">
                    {enregistrement
                      ? "Enregistrement…"
                      : declaration
                        ? "Mettre à jour"
                        : "Envoyer ma déclaration"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Choix du statut d'un jour */}
      {jourOuvert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black100/40" onClick={() => setJourOuvert(null)} />
          <div className="relative w-full sm:max-w-sm bloc bg-blanc p-6 rounded-b-none sm:rounded-bloc max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="type-h4 text-noir capitalize">
                {format(new Date(jourOuvert), "EEEE d MMMM", { locale: fr })}
              </h3>
              <button
                onClick={() => setJourOuvert(null)}
                className="text-black60 hover:text-noir p-1 rounded-champ hover:bg-creme"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <ul className="space-y-1.5">
              {STATUTS_JOUR.map((statut) => (
                <li key={statut.id}>
                  <button
                    onClick={() => choisirStatut(jourOuvert, statut.id)}
                    className={`w-full text-left px-3 py-2 rounded-carte type-p14 hover:ring-2 hover:ring-orange ${
                      statut.classe
                    } ${statuts[jourOuvert] === statut.id ? "ring-2 ring-noir" : ""}`}
                  >
                    {statut.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function OuiNon({
  valeur,
  onChange,
  desactive,
}: {
  valeur: boolean | null;
  onChange: (valeur: boolean) => void;
  desactive: boolean;
}) {
  return (
    <div className="flex items-center bg-creme rounded-carte p-1">
      {[
        { valeur: true, label: "Oui" },
        { valeur: false, label: "Non" },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.valeur)}
          disabled={desactive}
          className={`flex-1 px-2 py-1.5 rounded-champ type-p14 transition-colors disabled:cursor-not-allowed ${
            valeur === option.valeur
              ? "bg-blanc text-noir ring-1 ring-contour"
              : "text-black60 hover:text-noir"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

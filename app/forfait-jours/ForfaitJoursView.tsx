"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import NavBar from "../NavBar";
import { ChargeBadge, ReposBadge, StatutBadge } from "./badges";
import SousNav from "./SousNav";
import type { NavState } from "@/lib/nav";
import type { ChargeRessentie, DeclarationMensuelle, Profile } from "@/lib/types";
import { LIBELLES_CHARGE } from "@/lib/types";
import { derniersMois, libelleMois } from "@/lib/mois";

interface Props {
  currentProfile: Profile;
  navState: NavState;
  declarations: DeclarationMensuelle[];
  managerNom: string | null;
}

const CHARGES: ChargeRessentie[] = ["sous_charge", "normale", "surcharge"];
const NB_MOIS_DECLARABLES = 12;

export default function ForfaitJoursView({
  currentProfile,
  navState,
  declarations,
  managerNom,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const moisDisponibles = derniersMois(NB_MOIS_DECLARABLES);
  const dejaDeclares = new Set(declarations.map((d) => d.mois));

  // Par défaut : le mois écoulé s'il reste à déclarer, sinon le mois en cours.
  // (on ne remonte pas aux mois antérieurs, qui ne seront jamais rattrapés)
  const moisEcoule = moisDisponibles[1];
  const moisParDefaut = dejaDeclares.has(moisEcoule) ? moisDisponibles[0] : moisEcoule;

  const [mois, setMois] = useState(moisParDefaut);
  const [jours, setJours] = useState("");
  const [charge, setCharge] = useState<ChargeRessentie>("normale");
  const [repos, setRepos] = useState<boolean | null>(null);
  const [commentaire, setCommentaire] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const declarationCourante = declarations.find((d) => d.mois === mois) ?? null;

  // Sans N+1, la déclaration est enregistrée sans validation et reste modifiable.
  const sansValidation = !currentProfile.manager_id;
  const modifiable =
    !declarationCourante || declarationCourante.statut !== "validee" || sansValidation;

  useEffect(() => {
    const existante = declarations.find((d) => d.mois === mois) ?? null;
    setJours(existante ? String(existante.jours_travailles) : "");
    setCharge(existante?.charge ?? "normale");
    setRepos(existante ? existante.repos_respectes : null);
    setCommentaire(existante?.commentaire ?? "");
    setErreur(null);
    setSucces(false);
  }, [mois, declarations]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);

    const nbJours = Number(jours.trim());
    if (!jours.trim() || !Number.isInteger(nbJours) || nbJours < 0 || nbJours > 31) {
      setErreur("Indiquez un nombre entier de jours travaillés, entre 0 et 31.");
      return;
    }
    if (repos === null) {
      setErreur("Indiquez si vos temps de repos ont été respectés.");
      return;
    }

    setEnregistrement(true);
    try {
      const valeurs = {
        jours_travailles: nbJours,
        charge,
        repos_respectes: repos,
        commentaire: commentaire.trim() || null,
      };

      const { error } = declarationCourante
        ? await supabase
            .from("declarations_mensuelles")
            .update(valeurs)
            .eq("id", declarationCourante.id)
        : await supabase
            .from("declarations_mensuelles")
            .insert({ ...valeurs, user_id: currentProfile.id, mois });

      if (error) {
        setErreur(error.message);
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

      <main className="max-w-6xl mx-auto px-4 sm:px-2 py-6">
        <SousNav navState={navState} actif="declaration" />

        <div className="mb-6">
          <h2 className="type-h3 text-noir">Suivi du forfait jours</h2>
          <p className="type-p14 text-black60 mt-0.5">
            {managerNom
              ? `Chaque mois, déclarez vos jours travaillés et votre charge. ${managerNom} valide ensuite votre déclaration.`
              : "Chaque mois, déclarez vos jours travaillés et votre charge. Vous n'avez pas de N+1 : vos déclarations sont enregistrées sans validation."}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
          {/* ─── Formulaire ─────────────────────────────────────────── */}
          <form onSubmit={enregistrer} className="card p-5">
            <h3 className="type-h4 text-noir mb-4">
              {declarationCourante ? "Modifier ma déclaration" : "Déclarer un mois"}
            </h3>

            <label className="block type-p14 font-medium text-noir mb-1.5">Mois</label>
            <select
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              className="input-field mb-4 capitalize"
            >
              {moisDisponibles.map((m) => (
                <option key={m} value={m} className="capitalize">
                  {libelleMois(m)}
                  {dejaDeclares.has(m) ? " — déjà déclaré" : ""}
                </option>
              ))}
            </select>

            <label className="block type-p14 font-medium text-noir mb-1.5">
              Jours travaillés
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={31}
              step={1}
              value={jours}
              onChange={(e) => setJours(e.target.value)}
              placeholder="18"
              disabled={!modifiable}
              className="input-field mb-1"
            />
            <p className="type-p14 text-black60 mb-4">
              Une heure travaillée dans la journée compte pour un jour entier.
            </p>

            <label className="block type-p14 font-medium text-noir mb-1.5">
              Charge ressentie
            </label>
            <div className="flex items-center bg-creme rounded-carte p-1 mb-4">
              {CHARGES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCharge(c)}
                  disabled={!modifiable}
                  className={`flex-1 px-2 py-1.5 rounded-champ type-p14 font-medium transition-colors disabled:cursor-not-allowed ${
                    charge === c
                      ? "bg-blanc text-noir"
                      : "text-black60 hover:text-noir"
                  }`}
                >
                  {LIBELLES_CHARGE[c]}
                </button>
              ))}
            </div>

            <label className="block type-p14 font-medium text-noir mb-1.5">
              Temps de repos respectés
            </label>
            <p className="type-p14 text-black60 mb-2">
              Repos quotidien de 11 h et repos hebdomadaire de 35 h consécutives.
            </p>
            <div className="flex items-center bg-creme rounded-carte p-1 mb-4">
              {[
                { valeur: true, label: "Oui" },
                { valeur: false, label: "Non" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setRepos(option.valeur)}
                  disabled={!modifiable}
                  className={`flex-1 px-2 py-1.5 rounded-champ type-p14 font-medium transition-colors disabled:cursor-not-allowed ${
                    repos === option.valeur
                      ? "bg-blanc text-noir"
                      : "text-black60 hover:text-noir"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="block type-p14 font-medium text-noir mb-1.5">
              Commentaire <span className="text-black60 font-normal">(facultatif)</span>
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              disabled={!modifiable}
              placeholder="Un point à signaler sur ce mois ?"
              className="input-field mb-4 resize-y"
            />

            {declarationCourante?.commentaire_manager && (
              <div className="bg-orange/5 border border-orange/20 rounded-carte p-3 mb-4">
                <p className="type-p14 font-semibold text-orange mb-1">
                  Message de {managerNom ?? "votre manager"}
                </p>
                <p className="type-p14 text-noir/80">
                  {declarationCourante.commentaire_manager}
                </p>
              </div>
            )}

            {erreur && (
              <p className="type-p14 text-rouge mb-3" role="alert">
                {erreur}
              </p>
            )}
            {succes && (
              <p className="type-p14 text-black60 mb-3">
                {sansValidation
                  ? "Déclaration enregistrée."
                  : "Déclaration envoyée à votre manager."}
              </p>
            )}

            {modifiable ? (
              <button type="submit" disabled={enregistrement} className="btn-primary w-full">
                {enregistrement
                  ? "Enregistrement…"
                  : declarationCourante
                    ? "Mettre à jour"
                    : "Envoyer ma déclaration"}
              </button>
            ) : (
              <p className="type-p14 text-black60 text-center py-2">
                Ce mois a été validé : il n&apos;est plus modifiable. Demandez à{" "}
                {managerNom ?? "votre manager"} de rouvrir la déclaration si besoin.
              </p>
            )}
          </form>

          {/* ─── Historique ─────────────────────────────────────────── */}
          <section>
            <h3 className="type-h4 text-noir mb-3">Mon historique</h3>

            {declarations.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="type-p14 text-black60">
                  Aucune déclaration pour l&apos;instant.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {declarations.map((d) => (
                  <li key={d.id} className="card p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="type-p14 font-semibold text-noir capitalize">
                        {libelleMois(d.mois)}
                      </span>
                      <span className="type-p14 text-black60">
                        {d.jours_travailles} jour{d.jours_travailles > 1 ? "s" : ""}
                      </span>
                      <ChargeBadge charge={d.charge} />
                      <ReposBadge respectes={d.repos_respectes} />
                      <span className="ml-auto flex items-center gap-2">
                        <StatutBadge statut={d.statut} />
                        {d.mois !== mois && (
                          <button
                            onClick={() => setMois(d.mois)}
                            className="type-p14 text-orange hover:underline"
                          >
                            Ouvrir
                          </button>
                        )}
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
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

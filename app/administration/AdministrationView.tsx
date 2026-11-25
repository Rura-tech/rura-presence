"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "../NavBar";
import SousNavAdmin from "./SousNavAdmin";
import type { NavState } from "@/lib/nav";
import type { Profile, TypeContrat } from "@/lib/types";
import { LIBELLES_CONTRAT } from "@/lib/types";

interface Props {
  currentProfile: Profile;
  navState: NavState;
  profils: Profile[];
}

type Filtre = "tous" | "forfait_jours" | "sans_manager";

const TYPES: TypeContrat[] = ["non_cadre", "cadre_heures", "cadre_forfait_jours"];

/** Insensible à la casse et aux accents. */
function normalise(texte: string) {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function AdministrationView({ currentProfile, navState, profils }: Props) {
  const supabase = createClient();

  const [lignes, setLignes] = useState<Profile[]>(profils);
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const parId = useMemo(() => new Map(lignes.map((p) => [p.id, p])), [lignes]);

  const visibles = useMemo(() => {
    const q = normalise(recherche.trim());
    return lignes.filter((p) => {
      if (q && !normalise(`${p.prenom} ${p.nom} ${p.email}`).includes(q)) return false;
      if (filtre === "forfait_jours" && p.type_contrat !== "cadre_forfait_jours") return false;
      if (filtre === "sans_manager" && p.manager_id) return false;
      return true;
    });
  }, [lignes, recherche, filtre]);

  const sansManagerEnForfait = lignes.filter(
    (p) => p.type_contrat === "cadre_forfait_jours" && !p.manager_id
  );

  async function modifier(id: string, champs: Partial<Profile>) {
    setEnCours(id);
    setErreur(null);
    const precedent = parId.get(id);

    // Optimiste : on applique tout de suite, on revient en arrière si la base refuse.
    setLignes((actuelles) =>
      actuelles.map((p) => (p.id === id ? { ...p, ...champs } : p))
    );

    const { error } = await supabase.from("profiles").update(champs).eq("id", id);

    if (error) {
      setErreur(error.message);
      if (precedent) {
        setLignes((actuelles) => actuelles.map((p) => (p.id === id ? precedent : p)));
      }
    } else {
      setEnregistre(id);
      setTimeout(() => setEnregistre((v) => (v === id ? null : v)), 1500);
    }

    setEnCours(null);
  }

  return (
    <div className="min-h-screen bg-blanc">
      <NavBar currentProfile={currentProfile} activeTab="administration" navState={navState} />

      <main className="max-w-6xl mx-auto px-4 sm:px-2 py-6">
        <SousNavAdmin actif="salaries" />

        <div className="mb-6">
          <h2 className="type-h3 text-noir">Administration</h2>
          <p className="type-p14 text-black60 mt-0.5">
            Statut de contrat et lien hiérarchique de chaque salarié. Seules les personnes au
            forfait jours voient l&apos;onglet « Forfait jours ».
          </p>
        </div>

        {sansManagerEnForfait.length > 0 && (
          <div className="flex items-start gap-2 bg-jaune2/20 border border-jaune2 text-noir type-p14 rounded-carte px-3 py-2 mb-4">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              {sansManagerEnForfait.length === 1
                ? "1 personne au forfait jours n'a pas de N+1 : sa déclaration sera enregistrée sans validation."
                : `${sansManagerEnForfait.length} personnes au forfait jours n'ont pas de N+1 : leurs déclarations seront enregistrées sans validation.`}
            </span>
          </div>
        )}

        {/* Recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un nom, un e-mail…"
            className="input-field sm:max-w-xs"
          />
          <div className="flex items-center bg-creme rounded-carte p-1">
            {(
              [
                ["tous", "Tous"],
                ["forfait_jours", "Forfait jours"],
                ["sans_manager", "Sans N+1"],
              ] as [Filtre, string][]
            ).map(([valeur, label]) => (
              <button
                key={valeur}
                onClick={() => setFiltre(valeur)}
                className={`px-3 py-1.5 rounded-champ type-p14 font-medium transition-colors ${
                  filtre === valeur
                    ? "bg-blanc text-noir"
                    : "text-black60 hover:text-noir"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="type-p14 text-black60 sm:ml-auto self-center">
            {visibles.length} / {lignes.length}
          </span>
        </div>

        {erreur && (
          <p className="type-p14 text-rouge mb-3" role="alert">
            {erreur}
          </p>
        )}

        {/* Tableau */}
        <div className="card overflow-x-auto">
          <table className="w-full type-p14">
            <thead>
              <tr className="border-b border-contour text-left">
                <th className="px-4 py-2.5 font-semibold text-black60 type-p14 uppercase">
                  Salarié
                </th>
                <th className="px-4 py-2.5 font-semibold text-black60 type-p14 uppercase">
                  Statut
                </th>
                <th className="px-4 py-2.5 font-semibold text-black60 type-p14 uppercase">
                  N+1
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-contour">
              {visibles.map((p) => (
                <tr key={p.id} className={enCours === p.id ? "opacity-50" : ""}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-noir flex items-center gap-2">
                      {p.prenom} {p.nom}
                      {p.role === "admin_rh" && (
                        <span className="type-overline bg-orange/10 text-orange px-1.5 py-0.5 rounded">
                          RH
                        </span>
                      )}
                      {enregistre === p.id && (
                        <span className="type-p14 text-black60">enregistré</span>
                      )}
                    </div>
                    <div className="type-p14 text-black60">{p.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={p.type_contrat}
                      onChange={(e) =>
                        modifier(p.id, { type_contrat: e.target.value as TypeContrat })
                      }
                      className="input-field py-1.5 type-p14"
                      style={{ fontSize: "14px" }}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {LIBELLES_CONTRAT[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={p.manager_id ?? ""}
                      onChange={(e) =>
                        modifier(p.id, { manager_id: e.target.value || null })
                      }
                      className="input-field py-1.5 type-p14"
                      style={{ fontSize: "14px" }}
                    >
                      <option value="">— Aucun —</option>
                      {lignes
                        .filter((m) => m.id !== p.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.prenom} {m.nom}
                          </option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibles.length === 0 && (
            <p className="type-p14 text-black60 text-center py-8">Aucun résultat.</p>
          )}
        </div>
      </main>
    </div>
  );
}

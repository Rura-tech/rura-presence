"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function InscriptionPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profile) {
        router.push("/");
        return;
      }

      setUserEmail(user.email ?? null);
      setChecking(false);
    }

    checkAuth();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedPrenom = prenom.trim();
    const trimmedNom = nom.trim();

    if (!trimmedPrenom || !trimmedNom) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email!,
        prenom: trimmedPrenom,
        nom: trimmedNom.toUpperCase(),
      });

      if (insertError) {
        console.error(insertError);
        setError("Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme">
        <div className="text-black60 type-p14">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-creme">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="RURA"
            width={160}
            height={48}
            className="h-12 w-auto mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-noir">
            Bienvenue sur RURA Présence
          </h1>
          <p className="text-black60 mt-1 type-p14">
            Complétez votre profil pour commencer
          </p>
        </div>

        <div className="card p-8">
          {userEmail && (
            <div className="bg-creme border border-contour rounded-carte px-4 py-3 mb-6 type-p14 text-black60">
              Connecté avec : <span className="font-medium text-noir">{userEmail}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="prenom"
                className="block type-p14 font-medium text-noir mb-1.5"
              >
                Prénom
              </label>
              <input
                id="prenom"
                type="text"
                value={prenom}
                onChange={(e) => {
                  setPrenom(e.target.value);
                  setError(null);
                }}
                placeholder="Marie"
                className="input-field"
                required
                autoFocus
                autoComplete="given-name"
              />
            </div>

            <div>
              <label
                htmlFor="nom"
                className="block type-p14 font-medium text-noir mb-1.5"
              >
                Nom de famille
              </label>
              <input
                id="nom"
                type="text"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  setError(null);
                }}
                placeholder="DUPONT"
                className="input-field"
                required
                autoComplete="family-name"
              />
              <p className="mt-1.5 type-p14 text-black60">
                Sera affiché en majuscules.
              </p>
            </div>

            {error && (
              <div className="bg-rouge/10 border border-rouge/20 text-rouge type-p14 px-4 py-3 rounded-carte">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !prenom.trim() || !nom.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enregistrement…
                </>
              ) : (
                "Créer mon profil"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

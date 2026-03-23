"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Step = "email" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  function validateEmail(value: string): boolean {
    return value.trim().toLowerCase().endsWith("@rura.fr");
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    if (!validateEmail(trimmedEmail)) {
      setError("Seules les adresses @rura.fr sont acceptées.");
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setStep("otp");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 8 || !/^\d+$/.test(trimmedOtp)) {
      setError("Le code doit contenir exactement 8 chiffres.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmedOtp,
        type: "email",
      });

      if (verifyError) {
        setError("Code incorrect ou expiré. Veuillez réessayer.");
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        router.push(profile ? "/" : "/inscription");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-brand-bg">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="RURA"
            width={160}
            height={48}
            className="h-12 w-auto mx-auto mb-6"
          />
          <p className="text-brand-text/50 text-sm">
            Gestion des présences et réservations de salles
          </p>
        </div>

        <div className="card p-8">
          {step === "email" ? (
            <>
              <h2 className="text-lg font-semibold text-brand-text mb-1">
                Connexion
              </h2>
              <p className="text-sm text-brand-text/60 mb-6">
                Entrez votre adresse e-mail @rura.fr pour recevoir un code de connexion.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1.5">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="prenom.nom@rura.fr"
                    className="input-field"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                  <p className="mt-1.5 text-xs text-brand-text/40">
                    Uniquement les adresses @rura.fr sont acceptées.
                  </p>
                </div>

                {error && (
                  <div className="bg-brand-error/10 border border-brand-error/20 text-brand-error text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !email} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Envoi en cours…</>
                  ) : "Recevoir mon code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-brand-text mb-1">
                Entrez votre code
              </h2>
              <div className="bg-brand-bg border border-brand-text/15 text-brand-text text-sm px-4 py-3 rounded-lg mb-5">
                Un code à 8 chiffres a été envoyé à <span className="font-medium">{email}</span>.
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-brand-text mb-1.5">
                    Code à 8 chiffres
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                    placeholder="12345678"
                    className="input-field text-center text-xl tracking-widest font-mono"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <div className="bg-brand-error/10 border border-brand-error/20 text-brand-error text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || otp.length !== 8} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Vérification…</>
                  ) : "Se connecter"}
                </button>

                <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(null); }} className="w-full text-sm text-brand-text/50 hover:text-brand-text text-center py-1">
                  ← Modifier l&apos;adresse e-mail
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

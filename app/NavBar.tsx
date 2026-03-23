"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

interface Props {
  currentProfile: Profile;
  activeTab: "presence" | "salles";
}

export default function NavBar({ currentProfile, activeTab }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  return (
    <header className="bg-brand-surface border-b border-brand-text/10 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo + nav */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Image
              src="/favicon.png"
              alt="RURA"
              width={64}
              height={20}
              className="h-5 w-auto"
            />

            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "presence"
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-brand-text/60 hover:text-brand-text hover:bg-brand-bg"
                }`}
              >
                Présence
              </Link>
              <Link
                href="/salles"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "salles"
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-brand-text/60 hover:text-brand-text hover:bg-brand-bg"
                }`}
              >
                Salles
              </Link>
            </nav>
          </div>

          {/* User info + sign out */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-brand-text/60 hidden sm:block">
              {currentProfile.prenom} {currentProfile.nom}
            </span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs text-brand-text/50 hover:text-brand-text px-2 py-1.5 rounded-md hover:bg-brand-bg transition-colors"
            >
              {signingOut ? "…" : "Déconnexion"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

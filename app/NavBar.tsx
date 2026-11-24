"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import type { NavState, Onglet } from "@/lib/nav";

interface Props {
  currentProfile: Profile;
  activeTab: Onglet;
  navState: NavState;
}

export default function NavBar({ currentProfile, activeTab, navState }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  const onglets: { id: Onglet; href: string; label: string; pastille?: number | true }[] = [
    { id: "presence", href: "/", label: "Présence" },
  ];

  // Un seul onglet : la bascule déclaration / équipe se fait dans la page.
  if (navState.forfaitJours || navState.estManager) {
    onglets.push({
      id: "forfait-jours",
      href: navState.forfaitJours ? "/forfait-jours" : "/forfait-jours/equipe",
      label: "Forfait jours",
      pastille:
        navState.aValider > 0
          ? navState.aValider
          : navState.declarationManquante
            ? true
            : undefined,
    });
  }

  if (navState.administration) {
    onglets.push({
      id: "administration",
      href: "/administration",
      label: "Administration",
    });
  }

  return (
    <header className="bg-blanc border-b border-contour sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-2">
        <div className="flex items-center justify-between h-14">
          {/* Logo + nav */}
          <div className="flex items-center gap-6 min-w-0">
            <Image
              src="/logo.png"
              alt="RURA"
              width={64}
              height={20}
              className="h-5 w-auto shrink-0"
            />

            <nav className="flex items-center gap-1 overflow-x-auto">
              {onglets.map((onglet) => (
                <Link
                  key={onglet.id}
                  href={onglet.href}
                  className={`px-3 py-1.5 rounded-carte type-p14 font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === onglet.id
                      ? "bg-orange/10 text-orange"
                      : "text-black60 hover:text-noir hover:bg-creme"
                  }`}
                >
                  {onglet.label}
                  {onglet.pastille === true && (
                    <span
                      className="w-1.5 h-1.5 rounded-rond bg-orange"
                      aria-label="Déclaration à faire"
                    />
                  )}
                  {typeof onglet.pastille === "number" && (
                    <span className="bg-orange text-blanc text-[10px] font-bold leading-none rounded-rond min-w-[16px] h-4 px-1 flex items-center justify-center">
                      {onglet.pastille}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* User info + sign out */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="type-p14 text-black60 hidden sm:block">
              {currentProfile.prenom} {currentProfile.nom}
            </span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="type-p14 text-black60 hover:text-noir px-2 py-1.5 rounded-champ hover:bg-creme transition-colors"
            >
              {signingOut ? "…" : "Déconnexion"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

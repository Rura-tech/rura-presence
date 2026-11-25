// Rappelle aux personnes au forfait jours de déclarer le mois qui s'achève.
// Appelée par pg_cron le dernier jour du mois — la garde de date est dans le
// job, voir migrations/006_alertes_mail.sql.

import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Envoi Brevo (inliné : chaque fonction est autonome) ───────────────────
// Envoi transactionnel via Brevo. La clé et l'expéditeur viennent des secrets
// de la fonction : rien n'est écrit en dur ici.

const API = "https://api.brevo.com/v3/smtp/email";

interface Destinataire {
  email: string;
  nom: string;
}

async function envoyer(
  destinataire: Destinataire,
  sujet: string,
  contenu: string
): Promise<void> {
  const cle = Deno.env.get("BREVO_API_KEY");
  const expediteur = Deno.env.get("BREVO_EXPEDITEUR");

  if (!cle) throw new Error("BREVO_API_KEY manquante dans les secrets de la fonction.");
  if (!expediteur) throw new Error("BREVO_EXPEDITEUR manquante dans les secrets de la fonction.");

  const reponse = await fetch(API, {
    method: "POST",
    headers: {
      "api-key": cle,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: expediteur, name: "RURA Présence" },
      to: [{ email: destinataire.email, name: destinataire.nom }],
      subject: sujet,
      htmlContent: contenu,
    }),
  });

  if (!reponse.ok) {
    throw new Error(`Brevo a refusé l'envoi (${reponse.status}) : ${await reponse.text()}`);
  }
}

/** Gabarit commun, aux couleurs de la charte. */
function gabarit(titre: string, corps: string, lien: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#F0EDE4;font-family:Helvetica,Arial,sans-serif;color:#2B2B2B">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:8px;border:1px solid #D8D8D8">
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${titre}</h1>
        ${corps}
        <p style="margin:24px 0 0">
          <a href="${lien}" style="display:inline-block;background:#FF4E17;color:#FFFFFF;text-decoration:none;font-weight:bold;padding:10px 20px;border-radius:8px">
            Ouvrir RURA Présence
          </a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

const LIEN_APP = "https://rura-presence.vercel.app/forfait-jours";

/** « 2026-11-01 » -> « novembre 2026 » */
function libelleMois(mois: string): string {
  const [annee, m] = mois.split("-").map(Number);
  const noms = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  return `${noms[m - 1]} ${annee}`;
}

// ─── Fonction ──────────────────────────────────────────────────────────────

function moisEnCours(): string {
  const maintenant = new Date();
  return `${maintenant.getUTCFullYear()}-${String(maintenant.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mois = moisEnCours();

    const [{ data: concernes, error: e1 }, { data: faites, error: e2 }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, prenom, nom")
        .eq("type_contrat", "cadre_forfait_jours"),
      supabase.from("declarations_mensuelles").select("user_id").eq("mois", mois),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;

    const dejaFaites = new Set((faites ?? []).map((d) => d.user_id));
    const aRelancer = (concernes ?? []).filter((p) => !dejaFaites.has(p.id) && p.email);

    const libelle = libelleMois(mois);
    const corps = `
      <p style="margin:0 0 12px;font-size:16px;line-height:1.6">
        Le mois de <strong>${libelle}</strong> se termine aujourd'hui et votre déclaration de
        forfait jours n'a pas encore été envoyée.
      </p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#808080">
        Indiquez le statut de chaque jour du mois, répondez aux deux questions de suivi,
        puis envoyez. Les week-ends et les jours fériés sont déjà renseignés.
      </p>`;

    const resultats = await Promise.allSettled(
      aRelancer.map((p) =>
        envoyer(
          { email: p.email, nom: `${p.prenom} ${p.nom}` },
          `Votre déclaration de ${libelle} est attendue`,
          gabarit("Déclaration de forfait jours à envoyer", corps, LIEN_APP)
        )
      )
    );

    const echecs = resultats.filter((r) => r.status === "rejected");
    echecs.forEach((r) => console.error("rappel-declarations", (r as PromiseRejectedResult).reason));

    return new Response(
      JSON.stringify({ mois, relances: aRelancer.length, echecs: echecs.length }),
      { status: 200 }
    );
  } catch (erreur) {
    console.error("rappel-declarations", erreur);
    return new Response(JSON.stringify({ erreur: String(erreur) }), { status: 500 });
  }
});

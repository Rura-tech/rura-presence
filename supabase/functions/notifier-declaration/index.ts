// Prévient le N+1 qu'une déclaration de forfait jours vient d'être déposée.
// Appelée par un webhook de base de données, uniquement quand une déclaration
// entre en statut « soumise » — le filtrage est fait côté SQL, voir
// migrations/006_alertes_mail.sql.

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

interface Declaration {
  id: string;
  user_id: string;
  manager_id: string | null;
  mois: string;
  jours_travailles: number;
  repos_respectes: boolean;
  difficulte: boolean;
  commentaire: string | null;
}

Deno.serve(async (requete) => {
  try {
    const charge = await requete.json();
    const declaration: Declaration | undefined = charge?.record;

    if (!declaration?.manager_id) {
      return new Response(JSON.stringify({ ignore: "pas de N+1" }), { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profils, error } = await supabase
      .from("profiles")
      .select("id, email, prenom, nom")
      .in("id", [declaration.user_id, declaration.manager_id]);

    if (error) throw error;

    const salarie = profils?.find((p) => p.id === declaration.user_id);
    const manager = profils?.find((p) => p.id === declaration.manager_id);

    if (!manager?.email || !salarie) {
      return new Response(JSON.stringify({ ignore: "destinataire introuvable" }), { status: 200 });
    }

    const mois = libelleMois(declaration.mois);
    const alertes: string[] = [];
    if (declaration.difficulte) alertes.push("une difficulté est signalée");
    if (!declaration.repos_respectes) alertes.push("les temps de repos n'ont pas été respectés");

    const corps = `
      <p style="margin:0 0 12px;font-size:16px;line-height:1.6">
        <strong>${salarie.prenom} ${salarie.nom}</strong> a déposé sa déclaration de
        <strong>${mois}</strong> : ${declaration.jours_travailles} jour${
          declaration.jours_travailles > 1 ? "s" : ""
        } travaillé${declaration.jours_travailles > 1 ? "s" : ""}.
      </p>
      ${
        alertes.length > 0
          ? `<p style="margin:0 0 12px;padding:10px 12px;background:#FAD02C33;border-radius:8px;font-size:15px;line-height:1.5">
               Ce mois appelle un échange : ${alertes.join(" et ")}.
             </p>`
          : ""
      }
      ${
        declaration.commentaire
          ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;font-style:italic;color:#808080">
               « ${declaration.commentaire} »
             </p>`
          : ""
      }
      <p style="margin:0;font-size:15px;line-height:1.6;color:#808080">
        Vous pouvez la valider ou demander un échange depuis l'onglet Forfait jours.
      </p>`;

    await envoyer(
      { email: manager.email, nom: `${manager.prenom} ${manager.nom}` },
      `Déclaration de ${salarie.prenom} ${salarie.nom} — ${mois}`,
      gabarit("Une déclaration attend votre validation", corps, `${LIEN_APP}/equipe`)
    );

    return new Response(JSON.stringify({ envoye: manager.email }), { status: 200 });
  } catch (erreur) {
    console.error("notifier-declaration", erreur);
    return new Response(JSON.stringify({ erreur: String(erreur) }), { status: 500 });
  }
});

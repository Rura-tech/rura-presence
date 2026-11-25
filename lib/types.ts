import type { StatutJour } from "./statuts";

export type TypeContrat = "non_cadre" | "cadre_heures" | "cadre_forfait_jours";
export type RoleApp = "salarie" | "admin_rh";
export type StatutDeclaration = "soumise" | "validee" | "echange_demande";

export interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  created_at: string;
  type_contrat: TypeContrat;
  manager_id: string | null;
  role: RoleApp;
}

export interface Presence {
  id: string;
  user_id: string;
  date: string;
  created_at: string;
  profiles?: Profile;
}

export interface Salle {
  id: string;
  nom: string;
  capacite: number;
  created_at: string;
}

export interface Reservation {
  id: string;
  salle_id: string;
  user_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  titre: string;
  created_at: string;
  profiles?: Profile;
  salles?: Salle;
}

export interface DayPresence {
  date: string;
  dateLabel: string;
  dayLabel: string;
  isToday: boolean;
  isPast: boolean;
  presences: (Presence & { profiles: Profile })[];
  currentUserPresent: boolean;
  presenceId?: string;
}

export interface DeclarationMensuelle {
  id: string;
  user_id: string;
  mois: string;
  jours_travailles: number;
  repos_respectes: boolean;
  difficulte: boolean;
  commentaire: string | null;
  statut: StatutDeclaration;
  manager_id: string | null;
  commentaire_manager: string | null;
  submitted_at: string;
  envoyee_at: string | null;
  decided_at: string | null;
  updated_at: string;
  profiles?: Profile;
  jours_declares?: JourDeclare[];
}

export interface JourDeclare {
  declaration_id: string;
  jour: string;
  statut: StatutJour;
}

export const LIBELLES_STATUT: Record<StatutDeclaration, string> = {
  soumise: "En attente de validation",
  validee: "Validée",
  echange_demande: "Échange demandé",
};

export const LIBELLES_CONTRAT: Record<TypeContrat, string> = {
  non_cadre: "Non cadre",
  cadre_heures: "Cadre (horaire)",
  cadre_forfait_jours: "Cadre au forfait jours",
};

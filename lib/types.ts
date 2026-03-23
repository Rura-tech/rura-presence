export interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  created_at: string;
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

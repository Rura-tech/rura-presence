-- ============================================================================
-- Pas de demi-journée : une heure travaillée dans la journée compte pour un
-- jour entier. La colonne passe donc de numeric(4,1) à integer.
-- ============================================================================

alter table declarations_mensuelles
  drop constraint declarations_mensuelles_jours_travailles_check;

alter table declarations_mensuelles
  alter column jours_travailles type integer using round(jours_travailles)::integer;

alter table declarations_mensuelles
  add constraint declarations_jours_travailles_check
  check (jours_travailles between 0 and 31);

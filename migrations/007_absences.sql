-- ============================================================================
-- Deux absences de plus dans le calendrier : « Maladie » et « Évènement
-- personnel ». Seul le libellé est enregistré — aucun motif, aucun justificatif,
-- aucune précision médicale : le détail reste du ressort de la paie.
--
-- Postgres ne sait pas retirer une valeur d'énumération : ces deux-là sont
-- définitives. Elles ne sont pas utilisées dans cette migration, sans quoi la
-- transaction échouerait.
-- ============================================================================

alter type statut_jour add value if not exists 'maladie';
alter type statut_jour add value if not exists 'evenement_personnel';

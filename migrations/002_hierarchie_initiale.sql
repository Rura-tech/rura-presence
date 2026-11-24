-- ============================================================================
-- Amorçage : liens hiérarchiques et droits d'administration
-- Écart avec la liste fournie : Mélina Chanteloze n'a pas de profil en base
-- (compte jamais créé) — son rattachement à Tiphaine Pellet reste à faire.
-- ============================================================================

with hierarchie(manager_nom, salarie_nom) as (
  values
    ('BERLIOUX', 'LARGERON'),
    ('BERLIOUX', 'ASSOULY'),
    ('BERLIOUX', 'TATON'),
    ('BERLIOUX', 'RANCOULE'),
    ('BERLIOUX', 'NANSE'),
    ('LARGERON', 'PELLET'),
    ('LARGERON', 'PHILIPON'),
    ('TATON',    'DUFLOT'),
    ('PELLET',   'MAIGA'),
    ('PELLET',   'DESMIDT'),
    ('PELLET',   'MAREC'),
    ('RANCOULE', 'MOHSENI'),
    ('RANCOULE', 'CHAUMETON'),
    ('RANCOULE', 'ARIBAUD'),
    ('RANCOULE', 'POIVET'),
    ('RANCOULE', 'RIGORD'),
    ('ASSOULY',  'DAHAN'),
    ('ASSOULY',  'YOSSANGUEM')
)
update profiles p
set manager_id = m.id
from hierarchie h
join profiles m on m.nom = h.manager_nom
where p.nom = h.salarie_nom;

-- Droits d'administration RH
update profiles set role = 'admin_rh' where nom in ('BERLIOUX', 'LARGERON');

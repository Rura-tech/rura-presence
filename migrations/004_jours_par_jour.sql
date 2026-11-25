-- ============================================================================
-- Déclaration jour par jour, sur le modèle du tableur de suivi.
-- Chaque jour du mois porte un statut ; le nombre de jours travaillés en
-- découle. La charge ressentie disparaît au profit des deux questions du
-- tableur (difficulté à déclarer, respect des heures de repos).
-- ============================================================================

create type statut_jour as enum (
  'jour_travaille',
  'repos_hebdomadaire',
  'conges_payes',
  'conges_supplementaires',
  'jours_feries_chomes',
  'jnt',
  'conges_sans_solde',
  'conge_exceptionnel'
);

create table jours_declares (
  declaration_id uuid not null references declarations_mensuelles(id) on delete cascade,
  jour           date not null,
  statut         statut_jour not null,
  primary key (declaration_id, jour)
);

alter table jours_declares enable row level security;

-- Les droits suivent ceux de la déclaration qui les porte.
create policy "Lecture des jours"
  on jours_declares for select
  using (exists (
    select 1 from declarations_mensuelles d
    where d.id = declaration_id
      and (d.user_id = auth.uid() or d.manager_id = auth.uid() or public.est_admin_rh())
  ));

create policy "Saisie de ses propres jours"
  on jours_declares for insert
  with check (exists (
    select 1 from declarations_mensuelles d
    where d.id = declaration_id and d.user_id = auth.uid()
      and (d.statut <> 'validee' or d.manager_id is null)
  ));

create policy "Correction de ses propres jours"
  on jours_declares for update
  using (exists (
    select 1 from declarations_mensuelles d
    where d.id = declaration_id and d.user_id = auth.uid()
      and (d.statut <> 'validee' or d.manager_id is null)
  ));

create policy "Suppression de ses propres jours"
  on jours_declares for delete
  using (exists (
    select 1 from declarations_mensuelles d
    where d.id = declaration_id and d.user_id = auth.uid()
      and (d.statut <> 'validee' or d.manager_id is null)
  ));

-- Le nombre de jours travaillés n'est plus saisi : il est compté.
create function public.recalcule_jours_travailles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_declaration uuid := coalesce(new.declaration_id, old.declaration_id);
begin
  update declarations_mensuelles
  set jours_travailles = (
    select count(*) from jours_declares
    where declaration_id = v_declaration and statut = 'jour_travaille'
  )
  where id = v_declaration;
  return null;
end;
$$;

create trigger trg_recalcule_jours_travailles
  after insert or update or delete on jours_declares
  for each row execute function public.recalcule_jours_travailles();

-- La charge ressentie disparaît.
alter table declarations_mensuelles drop column charge;

-- maj_declaration y faisait référence : on la réécrit sans.
create or replace function public.maj_declaration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if auth.uid() = old.user_id and (
       new.jours_travailles is distinct from old.jours_travailles
    or new.repos_respectes  is distinct from old.repos_respectes
    or new.commentaire      is distinct from old.commentaire
  ) then
    new.manager_id   := (select manager_id from public.profiles where id = old.user_id);
    new.submitted_at := now();
    new.commentaire_manager := null;
    if new.manager_id is null then
      new.statut     := 'validee';
      new.decided_at := now();
    else
      new.statut     := 'soumise';
      new.decided_at := null;
    end if;
    return new;
  end if;

  if auth.uid() = old.manager_id then
    new.user_id          := old.user_id;
    new.mois             := old.mois;
    new.jours_travailles := old.jours_travailles;
    new.repos_respectes  := old.repos_respectes;
    new.commentaire      := old.commentaire;
    new.manager_id       := old.manager_id;
    if new.statut is distinct from old.statut then
      new.decided_at := now();
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop type charge_ressentie;

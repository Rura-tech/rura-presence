-- ============================================================================
-- Forfait jours : statut de contrat, lien hiérarchique, déclarations mensuelles
-- ============================================================================

-- 1. Types --------------------------------------------------------------------

create type type_contrat       as enum ('non_cadre', 'cadre_heures', 'cadre_forfait_jours');
create type role_app           as enum ('salarie', 'admin_rh');
create type charge_ressentie   as enum ('sous_charge', 'normale', 'surcharge');
create type statut_declaration as enum ('soumise', 'validee', 'echange_demande');

-- 2. profiles -----------------------------------------------------------------

alter table profiles
  add column type_contrat type_contrat not null default 'non_cadre',
  add column manager_id   uuid references profiles(id) on delete set null,
  add column role         role_app not null default 'salarie';

alter table profiles
  add constraint profiles_manager_different check (manager_id is distinct from id);

create index profiles_manager_id_idx on profiles (manager_id);

-- 3. Qui est administratrice RH ? ---------------------------------------------
-- security definer : indispensable, sinon la policy sur profiles qui lit
-- profiles provoque une récursion infinie.

create function public.est_admin_rh()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin_rh'
  );
$$;

grant execute on function public.est_admin_rh() to authenticated;

-- 4. Protection des champs sensibles ------------------------------------------
-- La policy "Users can update own profile" laisse un salarié modifier sa propre
-- ligne : sans ce garde-fou il pourrait s'attribuer admin_rh ou changer de N+1.
-- auth.uid() is null = accès service_role / éditeur SQL, non concerné.

create function public.protege_champs_rh()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role, new.type_contrat, new.manager_id)
       is distinct from (old.role, old.type_contrat, old.manager_id)
     and auth.uid() is not null
     and not public.est_admin_rh()
  then
    raise exception 'Seules les administratrices RH peuvent modifier le rôle, le type de contrat ou le manager.';
  end if;
  return new;
end;
$$;

create trigger trg_protege_champs_rh
  before update on profiles
  for each row execute function public.protege_champs_rh();

-- 5. Policies profiles ---------------------------------------------------------

drop policy if exists "Users can update own profile" on profiles;

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "RH peut modifier tous les profils"
  on profiles for update
  using (public.est_admin_rh())
  with check (public.est_admin_rh());

-- 6. Déclarations mensuelles ---------------------------------------------------
-- manager_id est figé dans la déclaration (et non lu à la volée depuis profiles)
-- pour que l'historique reste rattaché au manager qui a réellement validé.

create table declarations_mensuelles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references profiles(id) on delete cascade,
  mois                date not null,
  jours_travailles    numeric(4,1) not null check (jours_travailles >= 0 and jours_travailles <= 31),
  charge              charge_ressentie not null,
  repos_respectes     boolean not null,
  commentaire         text,
  statut              statut_declaration not null default 'soumise',
  manager_id          uuid references profiles(id) on delete set null,
  commentaire_manager text,
  submitted_at        timestamptz not null default now(),
  decided_at          timestamptz,
  updated_at          timestamptz not null default now(),
  constraint declarations_mois_premier_jour check (mois = date_trunc('month', mois)::date),
  constraint declarations_unique_mois unique (user_id, mois)
);

create index declarations_manager_statut_idx on declarations_mensuelles (manager_id, statut);
create index declarations_user_mois_idx      on declarations_mensuelles (user_id, mois desc);

alter table declarations_mensuelles enable row level security;

-- 7. Règles métier côté base ---------------------------------------------------
-- Le salarié ne choisit pas son validateur : il est repris de profiles.
-- Sans N+1 (Salomé), la déclaration est enregistrée sans passer par une validation.

create function public.prepare_declaration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manager uuid;
begin
  select manager_id into v_manager from public.profiles where id = new.user_id;

  new.manager_id   := v_manager;
  new.submitted_at := now();
  new.updated_at   := now();

  if v_manager is null then
    new.statut     := 'validee';
    new.decided_at := now();
  else
    new.statut     := 'soumise';
    new.decided_at := null;
  end if;

  return new;
end;
$$;

create trigger trg_prepare_declaration
  before insert on declarations_mensuelles
  for each row execute function public.prepare_declaration();

-- Le salarié qui corrige renvoie sa déclaration en validation ;
-- le manager ne peut toucher qu'au statut et à son commentaire.

create function public.maj_declaration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();

  if auth.uid() = old.user_id and (
       new.jours_travailles is distinct from old.jours_travailles
    or new.charge           is distinct from old.charge
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
    new.charge           := old.charge;
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

create trigger trg_maj_declaration
  before update on declarations_mensuelles
  for each row execute function public.maj_declaration();

-- 8. Policies déclarations ------------------------------------------------------

create policy "Lecture : la sienne, celles de son équipe, ou RH"
  on declarations_mensuelles for select
  using (
    user_id = auth.uid()
    or manager_id = auth.uid()
    or public.est_admin_rh()
  );

create policy "Création : sa propre déclaration, si forfait jours"
  on declarations_mensuelles for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and type_contrat = 'cadre_forfait_jours'
    )
  );

create policy "Correction : tant que non validée, ou si pas de N+1"
  on declarations_mensuelles for update
  using (user_id = auth.uid() and (statut <> 'validee' or manager_id is null))
  with check (user_id = auth.uid());

create policy "Décision du manager"
  on declarations_mensuelles for update
  using (manager_id = auth.uid())
  with check (manager_id = auth.uid());

create policy "Suppression : tant que non validée, ou si pas de N+1"
  on declarations_mensuelles for delete
  using (user_id = auth.uid() and (statut <> 'validee' or manager_id is null));

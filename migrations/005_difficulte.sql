-- ============================================================================
-- « As-tu une difficulté à déclarer ce mois-ci ? » remplace la charge ressentie :
-- une question fermée, à côté du respect des repos et du commentaire libre.
-- ============================================================================

alter table declarations_mensuelles
  add column difficulte boolean not null default false;

-- Une difficulté déclarée est une correction du salarié comme une autre :
-- elle renvoie la déclaration en validation.
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
    or new.difficulte       is distinct from old.difficulte
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
    new.difficulte       := old.difficulte;
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

-- ============================================================================
-- Alertes mail : prévenir le N+1 d'un dépôt, et rappeler le dernier jour du mois.
--
-- PRÉALABLES, à faire une fois dans Supabase et que je ne peux pas faire :
--   1. Secrets des Edge Functions : BREVO_API_KEY et BREVO_EXPEDITEUR
--   2. Clé de service dans le Vault, pour que la base puisse appeler les
--      fonctions :  select vault.create_secret('<service_role_key>', 'service_role_key');
-- Tant que le secret du Vault est absent, rien n'est envoyé : les fonctions
-- ci-dessous sortent sans erreur.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── Un envoi explicite, distinct des écritures intermédiaires ───────────────
-- Le dépôt écrit d'abord la déclaration, puis les 31 jours : une alerte posée
-- sur l'insertion annoncerait « 0 jour travaillé ». L'app horodate donc
-- envoyee_at en dernier, une fois le détail enregistré, et c'est ce passage
-- qui déclenche le mail — une seule fois, quel que soit le nombre d'écritures.
alter table declarations_mensuelles
  add column if not exists envoyee_at timestamptz;

create or replace function public.url_fonction(nom text)
returns text language sql immutable as $$
  select 'https://uigteusdjoofnhdjmrgo.supabase.co/functions/v1/' || nom;
$$;

create or replace function public.appelle_fonction(nom text, charge jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cle text;
begin
  select decrypted_secret into v_cle
  from vault.decrypted_secrets
  where name = 'service_role_key';

  -- Secret pas encore posé : on ne tente rien, et surtout on ne bloque pas
  -- l'enregistrement de la déclaration.
  if v_cle is null then
    raise notice 'service_role_key absente du Vault : aucun mail envoyé.';
    return;
  end if;

  perform net.http_post(
    url     := public.url_fonction(nom),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cle
    ),
    body    := charge
  );
end;
$$;

-- ── Alerte au N+1 ───────────────────────────────────────────────────────────
create or replace function public.alerte_declaration_envoyee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.appelle_fonction(
    'notifier-declaration',
    jsonb_build_object('record', to_jsonb(new))
  );
  return null;
end;
$$;

drop trigger if exists trg_alerte_declaration on declarations_mensuelles;
create trigger trg_alerte_declaration
  after update on declarations_mensuelles
  for each row
  when (
    new.envoyee_at is not null
    and new.envoyee_at is distinct from old.envoyee_at
    and new.manager_id is not null
    and new.statut = 'soumise'
  )
  execute function public.alerte_declaration_envoyee();

-- ── Rappel le dernier jour du mois ──────────────────────────────────────────
-- pg_cron tourne en UTC : 07:00 UTC vaut 8 h à Paris en hiver, 9 h en été.
-- Le job s'arme du 28 au 31 et ne part que si demain est le 1er, ce qui couvre
-- février comme les mois de 30 et 31 jours.
select cron.unschedule('rappel-forfait-jours')
where exists (select 1 from cron.job where jobname = 'rappel-forfait-jours');

select cron.schedule(
  'rappel-forfait-jours',
  '0 7 28-31 * *',
  $cron$
  select public.appelle_fonction('rappel-declarations', '{}'::jsonb)
  where (current_date + 1) = (date_trunc('month', current_date) + interval '1 month')::date;
  $cron$
);

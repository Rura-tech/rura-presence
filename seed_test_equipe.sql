-- Équipe de test rattachée à Boubacar MAIGA, pour visualiser la vue N+1
-- avec des données fictives, sans utiliser le compte d'un collègue.
-- À lancer dans l'éditeur SQL Supabase. Suppression : voir la dernière ligne.

DO $$
DECLARE
  v_manager uuid;
  v_id      uuid;
  v_decl    uuid;
  i         int;
  prenoms   text[] := array['Alpha', 'Beta'];
BEGIN
  SELECT id INTO v_manager FROM public.profiles WHERE nom = 'MAIGA';

  FOR i IN 1..2 LOOP
    v_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, aud, role
    ) VALUES (
      v_id, '00000000-0000-0000-0000-000000000000',
      'equipe-test+' || i || '@test.com',
      crypt('Password123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}', '{}',
      'authenticated', 'authenticated'
    );

    INSERT INTO public.profiles (id, email, nom, prenom, type_contrat, manager_id)
    VALUES (v_id, 'equipe-test+' || i || '@test.com', 'TEST', prenoms[i],
            'cadre_forfait_jours', v_manager);

    -- Alpha signale une difficulté et des repos non respectés, Beta non.
    INSERT INTO public.declarations_mensuelles (
      user_id, mois, jours_travailles, repos_respectes, difficulte, commentaire
    ) VALUES (
      v_id, '2026-10-01', 0, i <> 1, i = 1,
      CASE i WHEN 1 THEN 'Deux livrables décalés sur la même semaine.' ELSE NULL END
    ) RETURNING id INTO v_decl;

    -- Détail des 31 jours d'octobre : le nombre de jours travaillés
    -- est recalculé automatiquement par la base à partir de ces lignes.
    INSERT INTO public.jours_declares (declaration_id, jour, statut)
    SELECT v_decl, d::date,
      CASE
        WHEN extract(isodow from d) >= 6 THEN 'repos_hebdomadaire'
        WHEN i = 1 AND d::date BETWEEN '2026-10-19' AND '2026-10-23' THEN 'conges_payes'
        WHEN i = 2 AND d::date = '2026-10-15' THEN 'jnt'
        ELSE 'jour_travaille'
      END::statut_jour
    FROM generate_series('2026-10-01'::date, '2026-10-31'::date, '1 day') d;
  END LOOP;
END $$;

-- Tout retirer (profils, déclarations et détail partent en cascade) :
-- delete from auth.users where email like 'equipe-test+%@test.com';

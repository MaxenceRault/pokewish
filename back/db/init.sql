-- PokéWish : schéma de base de la wishlist
-- Exécution : npm run db:migrate (ou à la main dans Supabase > SQL Editor)
-- Rejouable sans risque : rien n'est recréé ni écrasé s'il existe déjà.

create table if not exists wishlist (
  pokemon_id  integer     primary key check (pokemon_id > 0), -- n° du Pokédex : pas de doublon
  name        text        not null check (length(trim(name)) > 0),
  caught      boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- Sécurité : la table n'est pas lisible avec la clé publique (anon).
-- Notre API Hono s'y connecte avec un accès serveur, qui n'est pas bloqué.
alter table wishlist enable row level security;

-- Données d'exemple, pour voir quelque chose dans le Table Editor
insert into wishlist (pokemon_id, name, caught) values
  (25, 'Pikachu', true),
  (4, 'Salamèche', false)
on conflict (pokemon_id) do nothing;

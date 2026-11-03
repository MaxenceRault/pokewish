-- Migration 001 : likes des Pokémon (un compteur par Pokémon).
-- Appliquée UNE seule fois par le runner (table schema_migrations) : pas
-- besoin de « if not exists ». Elle n'ajoute qu'une table : les données
-- existantes (wishlist) ne sont pas touchées.

create table likes (
  pokemon_id  integer     primary key check (pokemon_id > 0),
  count       integer     not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now()
);

-- Même règle que la wishlist : pas de lecture avec la clé publique (anon)
alter table likes enable row level security;

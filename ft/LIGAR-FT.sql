-- ============================================================
-- FT TRAVEL & EXPERIENCES — a sala "ft" no banco da Ti Artes (17/11/2026)
-- Igual à sala da Yalla: appstate, bookings, itens, kits, app_config,
-- seat_counts, is_owner() e kit(). Pode rodar mais de uma vez (idempotente).
--
-- Supabase → projeto "APP gestão TI ARTES" → SQL Editor → cole tudo → Run.
-- DEPOIS: Project Settings → Data API → "Exposed schemas" → acrescente  ft  → Save.
-- ============================================================

create schema if not exists ft;
grant usage on schema ft to anon, authenticated, service_role;

-- 1) quem é o dono do app (o primeiro login no painel da FT fica dono)
create table if not exists ft.app_config (
  id int primary key default 1 check (id = 1),
  owner_uid uuid
);
insert into ft.app_config (id) values (1) on conflict (id) do nothing;

create or replace function ft.is_owner() returns boolean
language sql stable security definer set search_path = ft, public as $$
  select exists (select 1 from ft.app_config where id = 1 and owner_uid = auth.uid());
$$;

-- 2) o catálogo, preços, regras e ajustes (1 documento)
create table if not exists ft.appstate (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into ft.appstate (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- 3) as reservas (linha a linha)
create table if not exists ft.bookings (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- 4) tudo o mais (clientes, orçamentos, equipe, tarefas, pedidos…): uma linha por registro
create table if not exists ft.itens (
  colecao text not null,
  id text not null,
  dados jsonb,
  apagado boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (colecao, id)
);
create index if not exists itens_atualizado_em on ft.itens (atualizado_em);
-- a sincronia lê "o que mudou depois de X": o carimbo é sempre a hora do banco
create or replace function ft.carimbo() returns trigger language plpgsql as $$
begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists carimbo on ft.itens;
create trigger carimbo before insert or update on ft.itens for each row execute function ft.carimbo();

-- 5) os links do cliente (proposta #/p e kit da viagem #/k)
create table if not exists ft.kits (
  token text primary key,
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);
create or replace function ft.kit(p_token text) returns jsonb
language sql stable security definer set search_path = ft, public as $$
  select dados from ft.kits where token = p_token;
$$;

-- 6) vagas públicas: só a contagem, sem dado pessoal
create or replace view ft.seat_counts as
  select data->>'tourId' as tour_id, data->>'date' as date, data->>'time' as time,
         sum((data->>'pax')::int) as pax
  from ft.bookings
  where coalesce(data->>'status', 'confirmed') <> 'cancelled'
  group by 1, 2, 3;
alter view ft.seat_counts set (security_invoker = off);

-- 7) REGRAS DE ACESSO (RLS)
alter table ft.app_config enable row level security;
alter table ft.appstate   enable row level security;
alter table ft.bookings   enable row level security;
alter table ft.itens      enable row level security;
alter table ft.kits       enable row level security;

drop policy if exists cfg_read  on ft.app_config;
drop policy if exists cfg_claim on ft.app_config;
create policy cfg_read  on ft.app_config for select using (true);
create policy cfg_claim on ft.app_config for update to authenticated
  using (owner_uid is null or owner_uid = auth.uid()) with check (owner_uid = auth.uid());

drop policy if exists state_read  on ft.appstate;
drop policy if exists state_write on ft.appstate;
create policy state_read  on ft.appstate for select using (true);
create policy state_write on ft.appstate for update to authenticated using (ft.is_owner()) with check (id = 1);

drop policy if exists bk_insert_public on ft.bookings;
drop policy if exists bk_read_owner    on ft.bookings;
drop policy if exists bk_write_owner   on ft.bookings;
drop policy if exists bk_delete_owner  on ft.bookings;
create policy bk_insert_public on ft.bookings for insert to anon, authenticated with check (true);
create policy bk_read_owner    on ft.bookings for select to authenticated using (ft.is_owner());
create policy bk_write_owner   on ft.bookings for update to authenticated using (ft.is_owner());
create policy bk_delete_owner  on ft.bookings for delete to authenticated using (ft.is_owner());

-- itens: o dono lê e escreve tudo; o visitante só CRIA pedido, orçamento ou avaliação (nunca publicada)
drop policy if exists it_owner  on ft.itens;
drop policy if exists it_public on ft.itens;
create policy it_owner  on ft.itens for all to authenticated using (ft.is_owner()) with check (ft.is_owner());
create policy it_public on ft.itens for insert to anon, authenticated
  with check (colecao in ('pedidos', 'orcamentos', 'avaliacoes') and apagado = false
              and (colecao <> 'avaliacoes' or coalesce((dados->>'publicar')::boolean, false) = false));

-- kits: só o dono grava; o público lê um por vez pela função kit(token)
drop policy if exists kit_owner on ft.kits;
create policy kit_owner on ft.kits for all to authenticated using (ft.is_owner()) with check (ft.is_owner());

-- 8) permissões (a RLS acima decide linha a linha)
grant select on ft.app_config, ft.appstate, ft.seat_counts to anon, authenticated;
grant update on ft.app_config, ft.appstate to authenticated;
grant insert on ft.bookings, ft.itens to anon, authenticated;
grant select, update, delete on ft.bookings to authenticated;
grant select, insert, update, delete on ft.itens, ft.kits to authenticated;
grant execute on function ft.is_owner(), ft.kit(text) to anon, authenticated;
grant all on all tables in schema ft to service_role;

-- 9) aviso por e-mail ao Roberto quando chega reserva ou pedido (mesma função das outras salas)
do $$ begin
  if exists (select 1 from pg_proc where proname = 'aviso_novo' and pronamespace = 'public'::regnamespace) then
    execute 'drop trigger if exists aviso_novo on ft.bookings';
    execute 'create trigger aviso_novo after insert on ft.bookings for each row execute function public.aviso_novo()';
    execute 'drop trigger if exists aviso_novo on ft.itens';
    execute 'create trigger aviso_novo after insert on ft.itens for each row when (new.colecao = ''pedidos'') execute function public.aviso_novo()';
  end if;
end $$;

-- 10) o PostgREST relê a estrutura
notify pgrst, 'reload schema';

select 'sala ft pronta' as status,
       (select count(*) from information_schema.tables where table_schema = 'ft') as tabelas;

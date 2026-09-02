-- ============================================================
-- app-guia — trancar os dados dos clientes
-- Cole no SQL Editor do Supabase e clique em Run.
-- Painel: https://supabase.com/dashboard/project/<SEU-PROJETO>/sql/new
-- ============================================================

-- 1) quem é a dona do app (definida no primeiro login dela)
create table if not exists app_config (
  id int primary key default 1 check (id = 1),
  owner_uid uuid
);
insert into app_config (id) values (1) on conflict (id) do nothing;
alter table app_config enable row level security;

drop policy if exists cfg_read on app_config;
create policy cfg_read on app_config for select using (true);

drop policy if exists cfg_claim on app_config;
create policy cfg_claim on app_config for update to authenticated
  using (owner_uid is null or owner_uid = auth.uid())
  with check (owner_uid = auth.uid());

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_config where id = 1 and owner_uid = auth.uid());
$$;

-- 2) RESERVAS: o público pode criar, mas NÃO pode ler
drop policy if exists bk_read on bookings;
drop policy if exists bk_insert on bookings;
drop policy if exists bk_update on bookings;
drop policy if exists bk_insert_public on bookings;
drop policy if exists bk_read_owner on bookings;
drop policy if exists bk_write_owner on bookings;

create policy bk_insert_public on bookings for insert to anon, authenticated with check (true);
create policy bk_read_owner    on bookings for select to authenticated using (is_owner());
create policy bk_write_owner   on bookings for update to authenticated using (is_owner());

-- 3) DISPONIBILIDADE pública: só a contagem de lugares, sem dado pessoal
create or replace view seat_counts as
  select data->>'tourId' as tour_id,
         data->>'date'   as date,
         data->>'time'   as time,
         sum((data->>'pax')::int) as pax
  from bookings
  where coalesce(data->>'status','confirmed') <> 'cancelled'
  group by 1,2,3;
alter view seat_counts set (security_invoker = off);
grant select on seat_counts to anon, authenticated;

-- 4) PASSEIOS E PREÇOS: público lê, só a dona escreve
drop policy if exists state_read on appstate;
drop policy if exists state_write on appstate;
create policy state_read  on appstate for select using (true);
create policy state_write on appstate for update to authenticated
  using (is_owner()) with check (id = 1);

-- conferência
select 'pronto' as status;

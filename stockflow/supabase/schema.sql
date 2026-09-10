-- ============================================================================
-- StockFlow Inventory Suite — Supabase schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`) on a
-- fresh project. Safe to re-run: objects are created with IF NOT EXISTS /
-- CREATE OR REPLACE where possible.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type workspace_type as enum ('coffee', 'bus');
exception when duplicate_object then null; end $$;

do $$ begin
  create type count_shift as enum ('opening', 'closing');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- inventory_items — stock on hand, shared shape for both workspaces
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  workspace workspace_type not null,
  name text not null,
  location text not null,
  quantity numeric not null default 0,
  unit text not null default 'pcs',
  reorder_point numeric not null default 0,
  sku text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists inventory_items_workspace_idx on public.inventory_items (workspace);
create index if not exists inventory_items_location_idx on public.inventory_items (location);

-- ----------------------------------------------------------------------------
-- physical_counts + physical_count_entries — shift counts and variance
-- ----------------------------------------------------------------------------
create table if not exists public.physical_counts (
  id uuid primary key default gen_random_uuid(),
  workspace workspace_type not null,
  location text not null,
  shift count_shift not null default 'opening',
  count_date date not null default current_date,
  counted_by text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.physical_count_entries (
  id uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.physical_counts (id) on delete cascade,
  item_id uuid references public.inventory_items (id) on delete set null,
  item_name text not null,
  unit text not null default 'pcs',
  opening_qty numeric not null default 0,
  closing_qty numeric not null default 0,
  target_qty numeric not null default 0,
  usage numeric not null default 0,
  variance numeric not null default 0
);

create index if not exists physical_count_entries_count_idx on public.physical_count_entries (count_id);

-- ----------------------------------------------------------------------------
-- audit_log — every mutation across the app writes a row here
-- ----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace workspace_type not null,
  actor text not null default 'Admin User',
  action text not null,
  details text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_workspace_idx on public.audit_log (workspace);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ----------------------------------------------------------------------------
-- spare_parts — bus fleet: parts / RFID / serialized assets
-- ----------------------------------------------------------------------------
create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bus_identifier text not null default 'Depot',
  identifier text,
  condition text not null default 'Good',
  quantity numeric not null default 0,
  unit text not null default 'pcs',
  reorder_point numeric not null default 0,
  status text not null default 'Available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- maintenance_schedules — bus fleet: preventive maintenance
-- ----------------------------------------------------------------------------
create table if not exists public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  bus_identifier text not null,
  service_type text not null,
  due_km numeric,
  remaining_km numeric,
  due_trips integer,
  remaining_trips integer,
  priority boolean not null default false,
  status text not null default 'Scheduled',
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- fuel_logs — bus fleet: fuel + mileage entries
-- ----------------------------------------------------------------------------
create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  bus_identifier text not null,
  odometer_km numeric not null,
  fuel_added_l numeric not null,
  distance_km numeric not null,
  recorded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_items_updated on public.inventory_items;
create trigger trg_inventory_items_updated
  before update on public.inventory_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_spare_parts_updated on public.spare_parts;
create trigger trg_spare_parts_updated
  before update on public.spare_parts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
--
-- This app uses a single shared login (per your setup: one admin/staff
-- account, no separate roles). The policy below simply requires the request
-- to be authenticated — any signed-in user has full read/write access to
-- every table. If you later add multiple team members with different
-- permission levels, replace these with per-role policies.
-- ============================================================================

alter table public.inventory_items enable row level security;
alter table public.physical_counts enable row level security;
alter table public.physical_count_entries enable row level security;
alter table public.audit_log enable row level security;
alter table public.spare_parts enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.fuel_logs enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'inventory_items',
      'physical_counts',
      'physical_count_entries',
      'audit_log',
      'spare_parts',
      'maintenance_schedules',
      'fuel_logs'
    ])
  loop
    execute format(
      'drop policy if exists "Authenticated full access" on public.%I;', t
    );
    execute format(
      'create policy "Authenticated full access" on public.%I
         for all using (auth.role() = ''authenticated'')
         with check (auth.role() = ''authenticated'');', t
    );
  end loop;
end $$;

-- ============================================================================
-- Realtime (optional) — lets the dashboard update live across tabs/devices
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.inventory_items;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.audit_log;
exception when duplicate_object then null; end $$;

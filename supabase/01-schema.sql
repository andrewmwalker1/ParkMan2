-- ParkMan2 -- Phase 1 core schema (Business, Park, Area, Season, Customer,
-- Caravan, Pitch, Ownership, Placement, Licence, Insurance).
-- Lives in its own `parkman2` schema inside the shared Hub Postgres
-- project -- a temporary bridge while ParkMan2 doesn't have its own
-- Supabase project yet (see PROJECT-BRIEF.md). auth.users is shared with
-- Hub since Auth is project-wide, not per-schema; parkman2.profiles is
-- ParkMan2's own separate profile/permission data layered on top of that
-- shared identity.

create schema if not exists parkman2;

-- ---------------------------------------------------------------------
-- People & access
-- ---------------------------------------------------------------------

create table if not exists parkman2.business (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  email text,
  vat_number text,
  company_number text,
  created_at timestamptz not null default now()
);

create table if not exists parkman2.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references parkman2.business(id) on delete cascade,
  display_name text not null,
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------
-- Park / Area / Season
-- ---------------------------------------------------------------------

create table if not exists parkman2.season (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  unique (business_id, name)
);

create table if not exists parkman2.park (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  fax text,
  web text,
  email text,
  vat_number text,
  company_number text,
  default_vat_rate numeric(5,2),
  bank_account_number text,
  bank_sort_code text,
  created_at timestamptz not null default now()
);

create table if not exists parkman2.area (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references parkman2.park(id) on delete cascade,
  season_id uuid references parkman2.season(id) on delete set null,
  name text not null,
  unique (park_id, name)
);

-- ---------------------------------------------------------------------
-- Pitch lookups (data-driven per business, not hardcoded enums -- see
-- PROJECT-BRIEF.md "a running pattern worth naming")
-- ---------------------------------------------------------------------

create table if not exists parkman2.pitch_type (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

create table if not exists parkman2.pitch_status (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

-- Pricing tier within an Area. Rate history (PitchBandRate) is a Phase 2
-- billing concern, deliberately not built yet.
create table if not exists parkman2.pitch_band (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references parkman2.area(id) on delete cascade,
  code text not null,
  unique (area_id, code)
);

-- ---------------------------------------------------------------------
-- Pitch
-- ---------------------------------------------------------------------

create table if not exists parkman2.pitch (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references parkman2.area(id) on delete cascade,
  pitch_band_id uuid references parkman2.pitch_band(id) on delete set null,
  type_id uuid not null references parkman2.pitch_type(id),
  status_id uuid not null references parkman2.pitch_status(id),
  number text not null,
  sort_key text not null,
  capacity integer not null default 1 check (capacity > 0),
  length numeric(6,2),
  width numeric(6,2),
  created_at timestamptz not null default now(),
  unique (area_id, number)
);

create table if not exists parkman2.pitch_note (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid not null references parkman2.pitch(id) on delete cascade,
  text text not null,
  actor_profile_id uuid references parkman2.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists parkman2.meter (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid not null references parkman2.pitch(id) on delete cascade,
  type text not null check (type in ('gas', 'electric', 'water')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Customer (see PROJECT-BRIEF.md for the design history -- settled after
-- a few iterations into a flattened Customer 1/2 household record, with
-- Primary vs Secondary decided per Ownership, not stored here)
-- ---------------------------------------------------------------------

create table if not exists parkman2.customer (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,

  customer1_title text,
  customer1_first_name text not null,
  customer1_surname text not null,
  customer1_phone text,
  customer1_email text,
  customer1_receives_billing boolean not null default true,

  customer2_title text,
  customer2_first_name text,
  customer2_surname text,
  customer2_phone text,
  customer2_email text,
  customer2_receives_billing boolean not null default false,

  correspondence_salutation text,
  address_salutation text,
  address text,
  postcode text,
  county text,
  language text,

  delivery_preference text not null default 'email' check (delivery_preference in ('email', 'paper')),
  mailing_list boolean not null default false,

  nok1_name text,
  nok1_relationship text,
  nok1_phone text,
  nok2_name text,
  nok2_relationship text,
  nok2_phone text,

  created_at timestamptz not null default now()
);

create table if not exists parkman2.customer_note (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references parkman2.customer(id) on delete cascade,
  text text not null,
  actor_profile_id uuid references parkman2.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Caravan
-- ---------------------------------------------------------------------

create table if not exists parkman2.caravan_type (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  default_licence_term_years integer,
  unique (business_id, name)
);

create table if not exists parkman2.caravan_status (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

create table if not exists parkman2.caravan (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  type_id uuid references parkman2.caravan_type(id),
  status_id uuid references parkman2.caravan_status(id),

  make text,
  model text,
  colour text,
  serial_number text,
  model_year integer,
  build_year integer,

  length numeric(6,2),
  width numeric(6,2),
  bedrooms integer,
  berths integer,

  key_number text,

  pat_test_expiry date,
  gas_test_expiry date,
  condition text,

  created_at timestamptz not null default now()
);

create index if not exists caravan_key_number_idx on parkman2.caravan (key_number);

-- ---------------------------------------------------------------------
-- Ownership / Placement -- see PROJECT-BRIEF.md, deliberately kept as
-- proper start/end-dated history tables (not current-state columns);
-- history itself is low-priority (audit trail), the row shape isn't.
-- ---------------------------------------------------------------------

create table if not exists parkman2.ownership (
  id uuid primary key default gen_random_uuid(),
  caravan_id uuid not null references parkman2.caravan(id) on delete cascade,
  primary_customer_id uuid not null references parkman2.customer(id),
  secondary_customer_id uuid references parkman2.customer(id),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

create index if not exists ownership_caravan_current_idx on parkman2.ownership (caravan_id) where end_date is null;

create table if not exists parkman2.placement (
  id uuid primary key default gen_random_uuid(),
  caravan_id uuid not null references parkman2.caravan(id) on delete cascade,
  pitch_id uuid references parkman2.pitch(id),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now()
);

create index if not exists placement_caravan_current_idx on parkman2.placement (caravan_id) where end_date is null;
create index if not exists placement_pitch_current_idx on parkman2.placement (pitch_id) where end_date is null;

-- ---------------------------------------------------------------------
-- Licence -- ties Customer + Caravan + Pitch together for a term. A Move
-- closes the current Licence and opens a new one (resolved in brief).
-- ---------------------------------------------------------------------

create table if not exists parkman2.licence (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references parkman2.customer(id),
  caravan_id uuid not null references parkman2.caravan(id),
  pitch_id uuid not null references parkman2.pitch(id),
  term_type text not null check (term_type in ('fixed', 'annual')),
  start_date date not null,
  end_date date not null,
  signed_returned_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Insurance -- Compass (park's introduced insurer) on a shared 1 Jul-30
-- Jun cycle needs no check; independent insurers trigger the Insurance
-- Check Fee and need chasing to stay current (see brief).
-- ---------------------------------------------------------------------

create table if not exists parkman2.insurance (
  id uuid primary key default gen_random_uuid(),
  caravan_id uuid not null references parkman2.caravan(id) on delete cascade,
  insurer text not null,
  is_independent boolean not null default false,
  start_date date not null,
  end_date date not null,
  certificate_file text,
  created_at timestamptz not null default now()
);

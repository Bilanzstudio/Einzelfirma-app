-- Buchhaltung für Schweizer Einzelunternehmen (Milchbüchlein nach OR 957 Abs. 2)
-- Mandantenfähig: Superadmin sieht alles, Kunden nur ihren eigenen Mandanten.

create extension if not exists "pgcrypto";

-- Mandanten (Einzelunternehmen) ------------------------------------------
create table public.mandanten (
  id uuid primary key default gen_random_uuid(),
  firmenname text not null,
  inhaber text not null,
  adresse text,
  plz text,
  ort text,
  uid_nummer text,            -- z.B. CHE-123.456.789 (freiwillig)
  geschaeftsjahr_start smallint not null default 1, -- Monat, 1 = Januar
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

-- Benutzerprofile ----------------------------------------------------------
create type public.rolle as enum ('superadmin', 'kunde');

create table public.profile (
  id uuid primary key references auth.users(id) on delete cascade,
  rolle public.rolle not null default 'kunde',
  mandant_id uuid references public.mandanten(id) on delete set null,
  name text,
  created_at timestamptz not null default now(),
  constraint kunde_braucht_mandant check (rolle = 'superadmin' or mandant_id is not null)
);

-- Hilfsfunktionen für Row Level Security ---------------------------------
create or replace function public.ist_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profile where id = auth.uid() and rolle = 'superadmin');
$$;

create or replace function public.mein_mandant() returns uuid
language sql stable security definer set search_path = public as $$
  select mandant_id from public.profile where id = auth.uid();
$$;

create or replace function public.darf_mandant(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.ist_superadmin() or m = public.mein_mandant();
$$;

-- Kategorien (global = mandant_id null, oder mandantenspezifisch) ----------
create type public.buchungstyp as enum ('einnahme', 'ausgabe');

create table public.kategorien (
  id uuid primary key default gen_random_uuid(),
  mandant_id uuid references public.mandanten(id) on delete cascade,
  typ public.buchungstyp not null,
  name text not null,
  steuer_position text,       -- Zuordnung Hilfsblatt Selbständigerwerbende
  sortierung smallint not null default 100,
  aktiv boolean not null default true
);

-- Geschäftsjahre (für Abschluss / Sperre) -------------------------------
create table public.geschaeftsjahre (
  mandant_id uuid not null references public.mandanten(id) on delete cascade,
  jahr smallint not null,
  abgeschlossen boolean not null default false,
  abgeschlossen_am timestamptz,
  abgeschlossen_von uuid references auth.users(id),
  notiz text,
  primary key (mandant_id, jahr)
);

-- Buchungen ---------------------------------------------------------------
create type public.zahlungsart as enum ('bank', 'bar', 'karte', 'twint', 'andere');
create type public.buchungsstatus as enum ('erfasst', 'geprueft');

create table public.buchungen (
  id uuid primary key default gen_random_uuid(),
  mandant_id uuid not null references public.mandanten(id) on delete cascade,
  datum date not null,
  typ public.buchungstyp not null,
  betrag numeric(12,2) not null check (betrag > 0),
  kategorie_id uuid references public.kategorien(id),
  zahlungsart public.zahlungsart not null default 'bank',
  beschreibung text not null,
  beleg_pfad text,            -- Pfad im Storage-Bucket "belege"
  privatanteil_prozent numeric(5,2) not null default 0 check (privatanteil_prozent between 0 and 100),
  status public.buchungsstatus not null default 'erfasst',
  erstellt_von uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index buchungen_mandant_datum on public.buchungen (mandant_id, datum);

-- Abgeschlossene Jahre sperren, geprüfte Buchungen nur Superadmin ändern
create or replace function public.buchung_schutz() returns trigger
language plpgsql security definer set search_path = public as $$
declare r public.buchungen;
begin
  r := coalesce(new, old);
  if exists (select 1 from public.geschaeftsjahre g
             where g.mandant_id = r.mandant_id
               and g.jahr = extract(year from r.datum)::smallint
               and g.abgeschlossen) then
    raise exception 'Das Geschäftsjahr % ist abgeschlossen.', extract(year from r.datum);
  end if;
  if tg_op = 'UPDATE' and old.datum is distinct from new.datum and exists (
       select 1 from public.geschaeftsjahre g
       where g.mandant_id = old.mandant_id and g.jahr = extract(year from old.datum)::smallint and g.abgeschlossen) then
    raise exception 'Das ursprüngliche Geschäftsjahr ist abgeschlossen.';
  end if;
  if not public.ist_superadmin() then
    if tg_op in ('UPDATE','DELETE') and old.status = 'geprueft' then
      raise exception 'Geprüfte Buchungen können nur von der Treuhänderin geändert werden.';
    end if;
    if tg_op in ('INSERT','UPDATE') and new.status = 'geprueft' then
      raise exception 'Nur die Treuhänderin kann Buchungen als geprüft markieren.';
    end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger buchung_schutz before insert or update or delete on public.buchungen
  for each row execute function public.buchung_schutz();

-- Row Level Security ------------------------------------------------------
alter table public.mandanten enable row level security;
alter table public.profile enable row level security;
alter table public.kategorien enable row level security;
alter table public.geschaeftsjahre enable row level security;
alter table public.buchungen enable row level security;

create policy mandanten_lesen on public.mandanten for select using (public.darf_mandant(id));
create policy mandanten_admin on public.mandanten for all using (public.ist_superadmin()) with check (public.ist_superadmin());

create policy profil_lesen on public.profile for select using (id = auth.uid() or public.ist_superadmin());
create policy profil_admin on public.profile for all using (public.ist_superadmin()) with check (public.ist_superadmin());

create policy kategorien_lesen on public.kategorien for select using (mandant_id is null or public.darf_mandant(mandant_id));
create policy kategorien_admin on public.kategorien for all using (public.ist_superadmin()) with check (public.ist_superadmin());

create policy jahre_lesen on public.geschaeftsjahre for select using (public.darf_mandant(mandant_id));
create policy jahre_admin on public.geschaeftsjahre for all using (public.ist_superadmin()) with check (public.ist_superadmin());

create policy buchungen_alles on public.buchungen for all
  using (public.darf_mandant(mandant_id)) with check (public.darf_mandant(mandant_id));

-- Belege im Storage: Pfad beginnt mit der mandant_id ---------------------
insert into storage.buckets (id, name, public) values ('belege', 'belege', false)
  on conflict (id) do nothing;

create policy belege_lesen on storage.objects for select
  using (bucket_id = 'belege' and public.darf_mandant(((storage.foldername(name))[1])::uuid));
create policy belege_hochladen on storage.objects for insert
  with check (bucket_id = 'belege' and public.darf_mandant(((storage.foldername(name))[1])::uuid));
create policy belege_admin_loeschen on storage.objects for delete
  using (bucket_id = 'belege' and public.ist_superadmin());
-- Kunden dürfen Belege nicht löschen (Aufbewahrungspflicht 10 Jahre, OR 958f).

-- Standardkategorien (angelehnt an Hilfsblatt für Selbständigerwerbende) --
insert into public.kategorien (mandant_id, typ, name, steuer_position, sortierung) values
  (null, 'einnahme', 'Erlöse aus Verkauf / Dienstleistungen', 'Ertrag', 10),
  (null, 'einnahme', 'Übrige Erträge', 'Übriger Ertrag', 20),
  (null, 'einnahme', 'Privateinlage', 'Privat', 90),
  (null, 'ausgabe', 'Material- und Warenaufwand', 'Waren-/Materialaufwand', 10),
  (null, 'ausgabe', 'Fremdleistungen', 'Drittleistungen', 15),
  (null, 'ausgabe', 'Personalaufwand', 'Personalaufwand', 20),
  (null, 'ausgabe', 'Sozialversicherungen (AHV des Inhabers)', 'Persönliche AHV/IV/EO', 25),
  (null, 'ausgabe', 'Miete / Raumkosten', 'Raumaufwand', 30),
  (null, 'ausgabe', 'Unterhalt und Reparaturen', 'Unterhalt', 35),
  (null, 'ausgabe', 'Fahrzeugaufwand', 'Fahrzeugaufwand', 40),
  (null, 'ausgabe', 'Versicherungen und Gebühren', 'Sachversicherungen, Abgaben', 45),
  (null, 'ausgabe', 'Energie und Entsorgung', 'Energieaufwand', 50),
  (null, 'ausgabe', 'Büro und Verwaltung', 'Verwaltungsaufwand', 55),
  (null, 'ausgabe', 'Telefon, Internet, Software', 'Verwaltungsaufwand', 60),
  (null, 'ausgabe', 'Werbung und Marketing', 'Werbeaufwand', 65),
  (null, 'ausgabe', 'Reise- und Verpflegungsspesen', 'Übriger Betriebsaufwand', 70),
  (null, 'ausgabe', 'Weiterbildung', 'Übriger Betriebsaufwand', 75),
  (null, 'ausgabe', 'Bankspesen und Zinsen', 'Finanzaufwand', 80),
  (null, 'ausgabe', 'Anschaffungen / Investitionen', 'Abschreibungen (separat)', 85),
  (null, 'ausgabe', 'Privatbezug', 'Privat', 90);

-- =====================================================================
-- ADLOR · IA — Registro de visitantes
-- Proyecto Supabase: adlor-ia (ref bciiywoszpssauxvbkar, us-east-1)
-- Aplicado el 24 de agosto de 2026.
--
-- Qué guarda: quién escribió, en qué producto o proyecto está interesado
-- o qué quiere construir con nosotros. Nada más. Sin calendario y sin
-- reservas: esto no agenda nada, solo recuerda.
-- =====================================================================

create table if not exists public.visitors (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- Quién
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  email       text not null check (char_length(email) between 5 and 200 and position('@' in email) > 1),

  -- Qué quiere: producto/proyecto de interés + lo que quiere construir
  interest    text check (interest is null or char_length(interest) <= 120),
  message     text check (message is null or char_length(message) <= 4000),

  -- De dónde llegó (contexto, no rastreo)
  source      text not null default 'adlor-ia.com' check (char_length(source) <= 80),
  page        text check (page is null or char_length(page) <= 500),
  referrer    text check (referrer is null or char_length(referrer) <= 500),

  -- Seguimiento manual desde el panel de Supabase
  status      text not null default 'nuevo' check (status in ('nuevo','contactado','en conversacion','cliente','descartado')),
  notes       text
);

comment on table public.visitors is
  'Visitantes que dejaron sus datos en adlor-ia.com: nombre, correo, producto/proyecto de interes y que quieren construir.';

create index if not exists visitors_created_at_idx on public.visitors (created_at desc);
create index if not exists visitors_interest_idx   on public.visitors (interest);
create index if not exists visitors_status_idx     on public.visitors (status);

alter table public.visitors enable row level security;

-- El sitio es estático: el navegador inserta con la clave publicable.
-- Solo puede INSERTAR. No puede leer, editar ni borrar nada.
drop policy if exists "anon puede registrarse" on public.visitors;
create policy "anon puede registrarse"
  on public.visitors
  for insert
  to anon
  with check (true);

-- Nadie con clave pública puede leer. La lectura es del dueño del proyecto
-- (service_role / panel de Supabase), que salta RLS por diseño.
revoke select, update, delete on public.visitors from anon;
revoke select, update, delete on public.visitors from authenticated;

-- =====================================================================
-- ADLOR · IA — Bitácora del agente del sitio
-- Proyecto Supabase: adlor-ia (ref bciiywoszpssauxvbkar, us-east-1)
-- Aplicado el 24 de agosto de 2026.
--
-- Un renglón por turno: qué preguntaron, qué contestó el agente y cuántos
-- tokens costó. Sirve para dos cosas — saber qué duda tiene la gente que
-- llega al sitio, y ver el gasto en vez de adivinarlo.
-- =====================================================================

create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- Agrupa los turnos de una misma conversación (id generado en el navegador)
  session_id  text not null check (char_length(session_id) between 8 and 64),
  turn        int  not null default 1 check (turn between 1 and 200),

  question    text not null check (char_length(question) <= 2000),
  answer      text check (answer is null or char_length(answer) <= 8000),

  page        text check (page is null or char_length(page) <= 500),
  model       text check (model is null or char_length(model) <= 80),

  -- Coste observado, para que el gasto no sea una sorpresa
  input_tokens  int check (input_tokens  is null or input_tokens  >= 0),
  output_tokens int check (output_tokens is null or output_tokens >= 0)
);

comment on table public.chats is
  'Bitacora del agente de adlor-ia.com: pregunta, respuesta y tokens por turno.';

create index if not exists chats_created_at_idx on public.chats (created_at desc);
create index if not exists chats_session_idx    on public.chats (session_id, turn);

alter table public.chats enable row level security;

-- Igual que `visitors`: la clave publicable solo puede INSERTAR.
-- El insert lo hace la función de Vercel, no el navegador.
drop policy if exists "solo insertar bitacora" on public.chats;
create policy "solo insertar bitacora"
  on public.chats
  for insert
  to anon
  with check (true);

revoke select, update, delete on public.chats from anon;
revoke select, update, delete on public.chats from authenticated;

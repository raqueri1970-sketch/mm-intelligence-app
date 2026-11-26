-- Tendências ("Em alta"): o que as pessoas estão buscando (Google, YouTube, Amazon, Google Trends) → produto na Shopee.
-- Já aplicado em produção em 26/11/2026. A função mm-shopee-trends roda a cada 2 horas (07h40–19h40 de Brasília).
create table if not exists public.mm_trend_seeds (
  seed text primary key,
  niche text,                 -- 'casa' = decoração/casa (entra na fila do Grupo VIP); null = presentes e outros
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mm_trend_terms (
  keyword text primary key,   -- termo normalizado (minúsculo, sem acento) — é o que vai para mm_shopee_keywords
  term text not null,         -- como as pessoas digitam
  sources text[] not null default '{}',
  seeds text[] not null default '{}',
  heat integer not null default 0,
  traffic text,
  niche text,
  shopee_sales bigint,
  shopee_items integer,
  good_items integer,
  best_commission numeric,
  relevance numeric,
  top_item jsonb,
  verdict text not null default 'nova' check (verdict in ('nova', 'em_alta', 'fraca', 'fora')),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  checked_at timestamptz
);
create index if not exists mm_trend_terms_verdict_idx on public.mm_trend_terms (verdict, heat desc);

alter table public.mm_trend_seeds enable row level security;
alter table public.mm_trend_terms enable row level security;
create policy "painel le sementes" on public.mm_trend_seeds for select to anon, authenticated using (true);
create policy "painel le tendencias" on public.mm_trend_terms for select to anon, authenticated using (true);

insert into public.mm_trend_seeds (seed, niche) values
 ('decoração de natal', 'casa'), ('enfeite de natal', 'casa'), ('árvore de natal', 'casa'), ('pisca pisca', 'casa'),
 ('mesa posta natal', 'casa'), ('ceia de natal', 'casa'), ('presépio', 'casa'), ('guirlanda de natal', 'casa'),
 ('luz de natal', 'casa'), ('decoração natalina', 'casa'), ('achadinhos shopee casa', 'casa'), ('achadinhos shopee cozinha', 'casa'),
 ('presente de natal', null), ('presente de natal para', null), ('amigo secreto', null), ('lembrancinha de natal', null),
 ('kit presente', null), ('look réveillon', null), ('black friday', null), ('achadinhos shopee', null)
on conflict (seed) do nothing;

select cron.schedule('mm-shopee-tendencias', '40 10-22/2 * * *',
  $$select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='mm_project_url')||'/functions/v1/mm-shopee-trends',headers:=jsonb_build_object('Content-Type','application/json','x-mm-cron',(select decrypted_secret from vault.decrypted_secrets where name='mm_cron_secret')),body:='{}'::jsonb,timeout_milliseconds:=150000);$$);

-- Instagram automático: posts das melhores ofertas e resposta "EU QUERO" no direct. Já aplicado em produção em 26/11/2026.
-- Os tokens ficam só no cofre (vault): mm_meta_app_secret, mm_meta_user_token (curto, para a configuração),
-- mm_meta_page_token (gerado pela função) e mm_ig_verify_token (gerado pela função).
create table if not exists public.mm_ig_config (
  id integer primary key default 1 check (id = 1),
  app_id text not null default '1166406429187059',
  page_id text, page_name text, ig_user_id text, ig_username text,
  connected_at timestamptz, webhook_ok boolean not null default false,
  posting_enabled boolean not null default true,
  post_slots text[] not null default '{10:00,15:00,20:00}',
  reply_text text not null default 'Oi! 😊 Aqui está o link do que você pediu:',
  last_error text, updated_at timestamptz not null default now()
);
insert into public.mm_ig_config (id) values (1) on conflict do nothing;

create table if not exists public.mm_ig_posts (
  id bigserial primary key,
  media_id text unique, item_id bigint, keyword text, name text, image text, price numeric,
  link text, caption text, permalink text, posted_at timestamptz not null default now()
);
create index if not exists mm_ig_posts_item_idx on public.mm_ig_posts (item_id, posted_at desc);

create table if not exists public.mm_ig_replies (
  comment_id text primary key,
  media_id text, username text, text text,
  replied_private boolean not null default false, replied_public boolean not null default false,
  error text, created_at timestamptz not null default now()
);

alter table public.mm_ig_config enable row level security;
alter table public.mm_ig_posts enable row level security;
alter table public.mm_ig_replies enable row level security;
create policy "painel le config ig" on public.mm_ig_config for select to anon, authenticated using (true);
create policy "painel liga posts ig" on public.mm_ig_config for update to anon, authenticated using (true)
  with check (id = 1 and coalesce(array_length(post_slots, 1), 0) <= 10 and char_length(reply_text) <= 300);
create policy "painel le posts ig" on public.mm_ig_posts for select to anon, authenticated using (true);
create policy "painel le respostas ig" on public.mm_ig_replies for select to anon, authenticated using (true);
revoke update on public.mm_ig_config from anon, authenticated;
grant update (posting_enabled, post_slots, reply_text) on public.mm_ig_config to anon, authenticated;

-- confere de hora em hora; a função só publica nos horários de mm_ig_config.post_slots
select cron.schedule('mm-instagram-posts', '5 * * * *',
  $$select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='mm_project_url')||'/functions/v1/mm-instagram',headers:=jsonb_build_object('Content-Type','application/json','x-mm-cron',(select decrypted_secret from vault.decrypted_secrets where name='mm_cron_secret')),body:='{"action":"post"}'::jsonb,timeout_milliseconds:=120000);$$);

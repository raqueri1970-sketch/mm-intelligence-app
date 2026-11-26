-- Aplicada em 26/11/2026 no projeto tazyeczbbgspqbyluynf (registro para versionamento).
-- Grupo VIP do WhatsApp por nicho: configuração, fila de mensagens e cliques do link da bio.
alter table public.mm_shopee_keywords add column if not exists niche text;

create table if not exists public.mm_vip_settings (
  niche text primary key, title text not null, group_link text, whatsapp_group_id text, instagram_handle text,
  slots text[] not null default array['09:00','12:00','15:00','18:00','21:00'],
  min_score numeric not null default 60, min_rate numeric not null default 10, min_sales integer not null default 500,
  max_per_keyword integer not null default 2, repeat_days integer not null default 7,
  active boolean not null default true, updated_at timestamptz not null default now()
);
create table if not exists public.mm_vip_queue (
  id bigserial primary key, niche text not null references public.mm_vip_settings(niche) on delete cascade,
  item_id bigint not null, keyword text, name text not null, image text, price numeric, sales integer, rating numeric,
  commission numeric, commission_rate numeric, score numeric, product_link text, affiliate_link text not null,
  message text not null, slot_at timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente','enviado','cancelado','erro')),
  sent_via text, sent_at timestamptz, error text, created_at timestamptz not null default now()
);
create unique index if not exists mm_vip_queue_slot_uniq on public.mm_vip_queue (niche, slot_at);
create index if not exists mm_vip_queue_item_idx on public.mm_vip_queue (niche, item_id, created_at desc);
create table if not exists public.mm_vip_clicks (
  id bigserial primary key, niche text not null, source text, clicked_at timestamptz not null default now()
);

alter table public.mm_vip_settings enable row level security;
alter table public.mm_vip_queue enable row level security;
alter table public.mm_vip_clicks enable row level security;
create policy "painel le vip config" on public.mm_vip_settings for select to anon, authenticated using (true);
create policy "painel edita vip config" on public.mm_vip_settings for update to anon, authenticated using (true)
  with check (min_score between 0 and 100 and min_rate between 0 and 100 and min_sales >= 0 and coalesce(char_length(group_link),0) <= 200);
create policy "painel le fila vip" on public.mm_vip_queue for select to anon, authenticated using (true);
create policy "painel marca fila vip" on public.mm_vip_queue for update to anon, authenticated using (true) with check (status in ('pendente','enviado','cancelado'));
create policy "bio registra clique" on public.mm_vip_clicks for insert to anon, authenticated
  with check (char_length(niche) <= 40 and coalesce(char_length(source),0) <= 40);
create policy "painel le cliques" on public.mm_vip_clicks for select to anon, authenticated using (true);

insert into public.mm_vip_settings (niche, title, instagram_handle)
values ('casa', 'Casa em Conta VIP', 'casaemconta') on conflict (niche) do nothing;

update public.mm_shopee_keywords set niche = 'casa'
 where keyword in ('organizador cozinha','organizador geladeira','dispenser detergente','mop giratorio','mini processador eletrico','luminaria sensor','aspirador portatil','umidificador');
insert into public.mm_shopee_keywords (keyword, active, niche) values
 ('organizador embaixo da pia', true, 'casa'), ('porta temperos giratorio', true, 'casa'), ('suporte tampas panela', true, 'casa'),
 ('divisoria gaveta', true, 'casa'), ('escorredor louca dobravel', true, 'casa'), ('pote hermetico', true, 'casa'),
 ('prateleira organizadora armario', true, 'casa'), ('utensilios silicone cozinha', true, 'casa'), ('cesto organizador', true, 'casa'),
 ('suporte papel toalha', true, 'casa')
on conflict (keyword) do update set niche = 'casa', active = true;

-- Agendamentos (UTC): fila às 08h45 de Brasília; envio às 09h02, 12h02, 15h02, 18h02 e 21h02.
-- select cron.schedule('mm-shopee-vip-fila', '45 11 * * *', ...action build...);
-- select cron.schedule('mm-shopee-vip-envio', '2 0,12,15,18,21 * * *', ...action send...);

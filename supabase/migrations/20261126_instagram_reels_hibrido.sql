-- Instagram híbrido (fotos + Reels) do @kliccasa. Já aplicado em produção em 26/11/2026.
-- Vídeos: enviados no painel (source 'manual') ou gerados das fotos do produto (source 'auto') pelo
-- workflow .github/workflows/reels-editor.yml (ffmpeg), via a função mm-video-api.
create table if not exists public.mm_ig_videos (
  id bigserial primary key,
  item_id bigint not null,
  source text not null default 'manual' check (source in ('manual','auto')),
  video_url text,
  cover_url text,
  caption_extra text,
  status text not null default 'pronto',
  container_id text,
  media_id text,
  error text,
  raw_path text,
  name text,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mm_ig_videos_status_check check (status in ('editar','editando','pronto','processando','publicado','erro','cancelado'))
);
create index if not exists mm_ig_videos_status_idx on public.mm_ig_videos (status, created_at);
create unique index if not exists mm_ig_videos_auto_item_uq on public.mm_ig_videos (item_id) where source = 'auto' and status in ('editar','editando','pronto','processando');
alter table public.mm_ig_videos enable row level security;
create policy "painel le videos ig" on public.mm_ig_videos for select to anon, authenticated using (true);
grant select on public.mm_ig_videos to anon, authenticated;

alter table public.mm_ig_posts add column if not exists media_type text not null default 'IMAGE';
alter table public.mm_ig_posts add column if not exists video_id bigint references public.mm_ig_videos(id);

-- horários que saem como Reel (os demais horários de post_slots saem como foto)
alter table public.mm_ig_config add column if not exists reel_slots text[] not null default '{10:00,20:00}';
grant update (reel_slots) on public.mm_ig_config to anon, authenticated;

-- vídeos brutos (raw/) e finais (final/) — upload só por URL assinada emitida pela mm-video-api
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mm-videos', 'mm-videos', true, 104857600, array['video/mp4','video/quicktime','image/jpeg'])
on conflict (id) do nothing;

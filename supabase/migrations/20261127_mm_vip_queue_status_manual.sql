-- produtos colados pelo link no painel do Instagram ficam na fila com status "manual" (niche "insta"),
-- fora do envio do Grupo VIP e dos posts automáticos
alter table public.mm_vip_queue drop constraint mm_vip_queue_status_check;
alter table public.mm_vip_queue add constraint mm_vip_queue_status_check
  check (status = any (array['pendente','enviado','cancelado','erro','expirado','manual']));

-- nicho só para guardar esses produtos (desativado: o Grupo VIP nunca envia nada dele)
insert into public.mm_vip_settings (niche, title, active) values ('insta', 'Instagram · produtos colados pelo link (não envia ao grupo)', false)
on conflict (niche) do nothing;

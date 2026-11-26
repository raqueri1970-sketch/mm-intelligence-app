-- Natal: decoração natalina vira campanha "natal" (nicho casa) e o garimpo é dividido em 3 execuções
-- para caber no limite de tempo da função mm-shopee-daily. (Já aplicado em produção em 26/11/2026.)

update public.mm_shopee_keywords set campaign = 'natal' where niche = 'casa' and keyword ~ 'natal|noel';

insert into public.mm_shopee_keywords (keyword, active, niche, campaign) values
 ('pisca pisca natal', true, 'casa', 'natal'), ('luz natal', true, 'casa', 'natal'), ('arvore de natal', true, 'casa', 'natal'),
 ('bola de natal', true, 'casa', 'natal'), ('enfeite natal', true, 'casa', 'natal'), ('decoracao natal', true, 'casa', 'natal'),
 ('guirlanda natal', true, 'casa', 'natal'), ('papai noel decoracao', true, 'casa', 'natal'), ('toalha mesa natal', true, 'casa', 'natal'),
 ('enfeite arvore natal', true, 'casa', 'natal'), ('cascata led natal', true, 'casa', 'natal'), ('fio de fada natal', true, 'casa', 'natal'),
 ('presepio natal', true, 'casa', 'natal'), ('boneco de neve natal', true, 'casa', 'natal'), ('meia de natal', true, 'casa', 'natal'),
 ('estrela arvore natal', true, 'casa', 'natal'), ('festao natal', true, 'casa', 'natal'), ('laco natal', true, 'casa', 'natal'),
 ('almofada natal', true, 'casa', 'natal'), ('tapete natal', true, 'casa', 'natal'), ('jogo americano natal', true, 'casa', 'natal'),
 ('pinheiro natal', true, 'casa', 'natal'), ('kit decoracao natal', true, 'casa', 'natal'), ('centro de mesa natal', true, 'casa', 'natal'),
 ('enfeite porta natal', true, 'casa', 'natal'), ('arvore de natal led', true, 'casa', 'natal'), ('capa almofada natalina', true, 'casa', 'natal')
on conflict (keyword) do update set active = true, niche = 'casa', campaign = 'natal';

-- 08h02 decoração de Natal · 08h20 palavras sem campanha + conversões · 08h33 presentes de Natal · 08h45 fila do Grupo VIP
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-daily'),
  command := $$select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='mm_project_url')||'/functions/v1/mm-shopee-daily',headers:=jsonb_build_object('Content-Type','application/json','x-mm-cron',(select decrypted_secret from vault.decrypted_secrets where name='mm_cron_secret')),body:='{"action":"all","days":7,"campaign":"none"}'::jsonb,timeout_milliseconds:=150000);$$);
select cron.schedule('mm-shopee-natal-decoracao', '2 11 * * *',
  $$select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='mm_project_url')||'/functions/v1/mm-shopee-daily',headers:=jsonb_build_object('Content-Type','application/json','x-mm-cron',(select decrypted_secret from vault.decrypted_secrets where name='mm_cron_secret')),body:='{"action":"mine","campaign":"natal","niche":"casa"}'::jsonb,timeout_milliseconds:=150000);$$);
select cron.schedule('mm-shopee-natal-presentes', '33 11 * * *',
  $$select net.http_post(url:=(select decrypted_secret from vault.decrypted_secrets where name='mm_project_url')||'/functions/v1/mm-shopee-daily',headers:=jsonb_build_object('Content-Type','application/json','x-mm-cron',(select decrypted_secret from vault.decrypted_secrets where name='mm_cron_secret')),body:='{"action":"mine","campaign":"natal","niche":"none"}'::jsonb,timeout_milliseconds:=150000);$$);

-- Grupo VIP: 30 ofertas por dia, de 30 em 30 minutos (08:00–22:30). Já aplicado em produção em 26/11/2026.
update public.mm_vip_settings
   set slots = (select array_agg(to_char(t, 'HH24:MI') order by t) from generate_series('2000-01-01 08:00'::timestamp, '2000-01-01 22:30', interval '30 minutes') t),
       repeat_days = 4
 where niche = 'casa';

-- Envio confere a fila a cada 30 min; garimpos e montagem da fila adiantados para terminar antes das 08:00 (horários em UTC).
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-vip-envio'), schedule := '2,32 * * * *');
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-natal-decoracao'), schedule := '2 10 * * *');   -- 07:02
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-daily'), schedule := '18 10 * * *');            -- 07:18
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-natal-presentes'), schedule := '30 10 * * *');  -- 07:30
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-tendencias'), schedule := '38 10-22/2 * * *');  -- 07:38, a cada 2 h
select cron.alter_job((select jobid from cron.job where jobname = 'mm-shopee-vip-fila'), schedule := '50 10 * * *');         -- 07:50

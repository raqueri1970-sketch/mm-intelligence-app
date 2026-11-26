-- Natal: guardanapo, cores vermelho e verde, e "fogos" (na Shopee: luzes LED efeito fogos + lança-confete).
-- Fogos de artifício de verdade não são vendidos na Shopee. (Já aplicado em produção em 26/11/2026.)
insert into public.mm_shopee_keywords (keyword, active, niche, campaign) values
 ('guardanapo de natal', true, 'casa', 'natal'), ('porta guardanapo natal', true, 'casa', 'natal'),
 ('guardanapo tecido natal', true, 'casa', 'natal'),
 ('decoracao de natal vermelha', true, 'casa', 'natal'), ('decoracao de natal verde', true, 'casa', 'natal'),
 ('fogos de artificio led natal', true, 'casa', 'natal'),
 ('lanca confete reveillon', true, null, 'natal')
on conflict (keyword) do update set active = true, niche = excluded.niche, campaign = 'natal';

insert into public.mm_trend_seeds (seed, niche) values
 ('guardanapo de natal', 'casa'), ('porta guardanapo', 'casa'), ('decoração de natal vermelha', 'casa'),
 ('decoração de natal verde', 'casa'), ('fogos de artifício', 'casa'), ('decoração réveillon', 'casa'), ('lança confete', null)
on conflict (seed) do update set active = true, niche = excluded.niche;

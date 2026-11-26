// MM · Shopee Afiliado — Tendências ("Em alta").
// Descobre o que as pessoas estão buscando agora e confere se existe produto vendendo bem na Shopee:
//   1. Autocompletar do Google, do YouTube e da Amazon Brasil para cada semente (mm_trend_seeds).
//   2. Google Trends do Brasil (buscas em alta do dia).
//   3. Cada termo novo é buscado na Shopee: se os produtos batem com o termo, vendem e pagam comissão,
//      o termo vira "em_alta", entra em mm_shopee_keywords (campanha "tendencia") e as ofertas vão para
//      mm_shopee_offers — assim aparecem no app, e os de casa/decoração entram na fila do Grupo VIP.
// Disparado pelo pg_cron com o header x-mm-cron (segredo do cofre).
import postgres from "npm:postgres@3.4.3";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 });
const APP = "https://mm-intelligence-app.vercel.app";
const H = { "Content-Type": "application/json" };
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_CHECKS = 45;        // buscas na Shopee por execução (a função tem limite de tempo)
const CONCURRENCY = 5;
const MAX_ACTIVE = 40;        // palavras de tendência mineradas ao mesmo tempo
const TOP_OFFERS = 20;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function secret(name: string) {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name}`;
  return r[0]?.decrypted_secret || "";
}
async function logRun(ok: boolean, message: string, counts: Record<string, unknown> = {}) {
  await sql`insert into public.mm_shopee_runs (kind, ok, message, counts) values ('trends', ${ok}, ${message}, ${sql.json(counts)})`;
}
async function pool<T, R>(list: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < list.length; i += n) out.push(...await Promise.allSettled(list.slice(i, i + n).map(fn)));
  return out;
}

// ---------- texto ----------
export function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
// Busca que não é de produto (filme, notícia, receita, cidade de Natal/RN...).
const NOISE = /\b(filme|filmes|serie|musica|musicas|letra|cifra|significado|significa|frase|frases|mensagem|mensagens|oracao|desenho|desenhos|colorir|png|pdf|wallpaper|historia|horario|horarios|onde|como fazer|receita|receitas|resultado|ao vivo|noticia|noticias|rn|cidade|praia|praias|hotel|pousada|clima|previsao|cardapio|feriado|ingresso|ingressos|show|vagas|emprego|dinamica|brincadeira|brincadeiras|o que|qual|quando|quanto custa|natal rn|ponta negra|data|dia|missa|conto|poema|video|videos|tiktok|instagram|whatsapp|link|cupom|codigo|gratis|sorteio|loja|lojas|perto de mim|shopping)\b/;
const FILLER = /\b(ideias? de|ideias? para|dicas de|2024|2025|2026|2027)\b/g;
const STOP = new Set(["de", "da", "do", "das", "dos", "para", "pra", "com", "sem", "e", "a", "o", "em", "no", "na", "um", "uma", "kit", "shopee", "achadinhos", "achadinho"]);
function shopeeQuery(keyword: string) {
  return keyword.replace(FILLER, " ").replace(/\bachadinhos?( da)? shopee\b/g, " ").replace(/\s+/g, " ").trim();
}
function tokens(keyword: string) {
  return keyword.split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
}

// ---------- fontes ----------
async function getJSON(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9", ...headers }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}
async function google(seed: string, ds = ""): Promise<string[]> {
  const j = await getJSON(`https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br${ds ? `&ds=${ds}` : ""}&q=${encodeURIComponent(seed)}`);
  return Array.isArray(j?.[1]) ? j[1].map(String) : [];
}
async function amazon(seed: string): Promise<string[]> {
  const j = await getJSON(`https://completion.amazon.com.br/api/2017/suggestions?limit=10&prefix=${encodeURIComponent(seed)}&suggestion-type=KEYWORD&page-type=Gateway&alias=aps&site-variant=desktop&version=3&lop=pt_BR&mid=A2Q3Y263D00KWC`);
  return (j?.suggestions || []).map((x: any) => String(x.value || "")).filter(Boolean);
}
async function trendsRss(): Promise<{ title: string; traffic: string }[]> {
  const r = await fetch("https://trends.google.com/trending/rss?geo=BR", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => ({
    title: (m[1].match(/<title>([^<]+)<\/title>/)?.[1] || "").replace(/&amp;/g, "&").trim(),
    traffic: m[1].match(/<ht:approx_traffic>([^<]+)</)?.[1] || "",
  })).filter((x) => x.title);
}

type Cand = { keyword: string; term: string; sources: Set<string>; seeds: Set<string>; heat: number; niche: string | null; traffic: string | null };

async function collect(seeds: { seed: string; niche: string | null }[]) {
  const map = new Map<string, Cand>();
  const add = (term: string, source: string, seed: string | null, niche: string | null, weight: number, traffic: string | null = null) => {
    const keyword = norm(term);
    if (!keyword || keyword.length < 4 || keyword.length > 60) return;
    if (seed && keyword === norm(seed)) return;
    const c = map.get(keyword) ?? { keyword, term: term.trim(), sources: new Set(), seeds: new Set(), heat: 0, niche, traffic };
    if (!c.sources.has(source)) c.heat += c.sources.size ? 6 : 0; // aparecer em mais de uma fonte esquenta o termo
    c.sources.add(source); if (seed) c.seeds.add(seed);
    c.heat += weight;
    if (niche === "casa") c.niche = "casa";
    if (traffic) c.traffic = traffic;
    map.set(keyword, c);
  };
  const jobs = seeds.flatMap((s) => [
    { s, src: "google", fn: () => google(s.seed) },
    { s, src: "youtube", fn: () => google(s.seed, "yt") },
    { s, src: "amazon", fn: () => amazon(s.seed) },
  ]);
  const errors: string[] = [];
  const res = await pool(jobs, 10, (j) => j.fn());
  res.forEach((r, i) => {
    const { s, src } = jobs[i];
    if (r.status === "rejected") { errors.push(`${src}/${s.seed}: ${(r.reason as Error)?.message}`); return; }
    r.value.slice(0, 10).forEach((t, pos) => add(t, src, s.seed, s.niche, 10 - pos));
  });
  try {
    for (const t of await trendsRss()) {
      const n = Number(t.traffic.replace(/\D/g, "")) || 100;
      add(t.title, "trends", null, null, Math.min(30, Math.round(Math.log10(n) * 6)), t.traffic);
    }
  } catch (e) { errors.push(`trends: ${(e as Error).message}`); }
  return { cands: [...map.values()], errors };
}

// ---------- validação na Shopee ----------
async function shopee(q: string) {
  let last: Error = new Error("sem resposta");
  for (let a = 0; a < 2; a++) {
    if (a) await sleep(2000);
    try {
      const r = await fetch(`${APP}/api/shopee/products?q=${encodeURIComponent(q)}&sort=2`, { signal: AbortSignal.timeout(40000) });
      const j = await r.json();
      if (r.ok) return (j.items || []) as any[];
      last = new Error(j.error || `HTTP ${r.status}`);
      if (r.status === 503) break;
    } catch (e) { last = e as Error; }
  }
  throw last;
}

async function check(keyword: string) {
  const q = shopeeQuery(keyword) || keyword;
  const items = await shopee(q);
  const top = items.slice(0, 10);
  const tk = tokens(q);
  const need = Math.max(1, Math.ceil(tk.length * 0.5));
  const hits = top.filter((p) => { const n = norm(p.name || ""); return tk.filter((t) => n.includes(t)).length >= need; }).length;
  const relevance = top.length ? hits / top.length : 0;
  const sales = top.reduce((a, p) => a + (Number(p.sales) || 0), 0);
  const goodList = items.filter((p) => Number(p.commissionRate) >= 10 && Number(p.sales) >= 100);
  const best = [...goodList].sort((a, b) => Number(b.score) - Number(a.score))[0] ?? top[0];
  const verdict = relevance >= 0.4 && sales >= 1500 && goodList.length >= 2 ? "em_alta" : "fraca";
  return {
    items, verdict, relevance: Math.round(relevance * 100) / 100, sales, good: goodList.length,
    bestCommission: goodList.length ? Math.max(...goodList.map((p) => Number(p.commission) || 0)) : null,
    top: best ? { id: best.id, name: best.name, image: best.image, price: best.price, sales: best.sales, commission: best.commission, commissionRate: best.commissionRate } : null,
  };
}

async function saveOffers(keyword: string, items: any[]) {
  const rows = items.slice(0, TOP_OFFERS).map((p: any) => ({
    keyword, item_id: p.id, name: p.name, shop: p.shop || null, price: p.price, sales: p.sales, rating: p.rating,
    commission_rate: p.commissionRate, commission: p.commission, score: p.score, image: p.image || null,
    product_link: p.productLink || null, affiliate_link: p.affiliateLink || null,
  }));
  const uniq = [...new Map(rows.map((x: any) => [x.item_id, x])).values()];
  if (!uniq.length) return 0;
  // não rouba itens já minerados hoje por outra palavra (mantém a palavra original)
  await sql`insert into public.mm_shopee_offers ${sql(uniq as any[], "keyword", "item_id", "name", "shop", "price", "sales", "rating", "commission_rate", "commission", "score", "image", "product_link", "affiliate_link")}
    on conflict (run_date, item_id) do update set sales = excluded.sales, price = excluded.price, commission = excluded.commission,
      commission_rate = excluded.commission_rate, affiliate_link = excluded.affiliate_link, collected_at = now()`;
  return uniq.length;
}

async function run() {
  const seeds = await sql<{ seed: string; niche: string | null }[]>`select seed, niche from public.mm_trend_seeds where active order by seed`;
  const { cands, errors } = await collect(seeds);

  // 1. registra o que apareceu nas buscas (ruído já sai marcado como "fora")
  for (const c of cands) {
    const fora = NOISE.test(c.keyword);
    await sql`insert into public.mm_trend_terms (keyword, term, sources, seeds, heat, traffic, niche, verdict)
      values (${c.keyword}, ${c.term}, ${sql.array([...c.sources])}, ${sql.array([...c.seeds])}, ${c.heat}, ${c.traffic}, ${c.niche}, ${fora ? "fora" : "nova"})
      on conflict (keyword) do update set term = excluded.term, heat = excluded.heat, traffic = coalesce(excluded.traffic, mm_trend_terms.traffic),
        sources = coalesce((select array_agg(distinct x) from unnest(mm_trend_terms.sources || excluded.sources) x), '{}'),
        seeds = coalesce((select array_agg(distinct x) from unnest(mm_trend_terms.seeds || excluded.seeds) x), '{}'),
        niche = coalesce(excluded.niche, mm_trend_terms.niche),
        verdict = case when excluded.verdict = 'fora' then 'fora' else mm_trend_terms.verdict end,
        last_seen = now()`;
  }

  // 2. escolhe o que buscar na Shopee: termos de hoje ainda não conferidos hoje + tendências ativas (para minerar de novo)
  const toCheck = await sql<{ keyword: string; niche: string | null }[]>`
    select keyword, niche from public.mm_trend_terms
     where verdict <> 'fora' and last_seen > now() - interval '3 days'
       and (checked_at is null or checked_at < now() - interval '20 hours')
     order by (verdict = 'em_alta') desc, heat desc
     limit ${MAX_CHECKS}`;

  let hot = 0, weak = 0, saved = 0;
  const res = await pool(toCheck, CONCURRENCY, async (t) => {
    const r = await check(t.keyword);
    await sql`update public.mm_trend_terms set verdict = ${r.verdict}, relevance = ${r.relevance}, shopee_sales = ${r.sales},
      shopee_items = ${r.items.length}, good_items = ${r.good}, best_commission = ${r.bestCommission}, top_item = ${r.top ? sql.json(r.top) : null},
      checked_at = now() where keyword = ${t.keyword}`;
    if (r.verdict === "em_alta") {
      hot++;
      saved += await saveOffers(t.keyword, r.items);
      await sql`insert into public.mm_shopee_keywords (keyword, active, niche, campaign) values (${t.keyword}, true, ${t.niche}, 'tendencia')
        on conflict (keyword) do update set active = true where mm_shopee_keywords.campaign = 'tendencia'`;
    } else weak++;
    return r.verdict;
  });
  res.forEach((r, i) => { if (r.status === "rejected") errors.push(`${toCheck[i].keyword}: ${(r.reason as Error)?.message}`); });

  // 3. tendências esfriam: sai da mineração quem não aparece há 5 dias ou perdeu força; mantém no máximo MAX_ACTIVE
  await sql`update public.mm_shopee_keywords k set active = false
     where k.campaign = 'tendencia' and k.active and not exists (
       select 1 from public.mm_trend_terms t where t.keyword = k.keyword and t.verdict = 'em_alta' and t.last_seen > now() - interval '5 days')`;
  await sql`update public.mm_shopee_keywords set active = false where campaign = 'tendencia' and active and keyword not in (
       select t.keyword from public.mm_trend_terms t join public.mm_shopee_keywords k on k.keyword = t.keyword and k.campaign = 'tendencia' and k.active
        order by t.heat desc limit ${MAX_ACTIVE})`;

  const msg = `${cands.length} buscas coletadas; ${toCheck.length} conferidas na Shopee: ${hot} em alta, ${weak} fracas; ${saved} ofertas` +
    (errors.length ? `; avisos: ${errors.slice(0, 3).join(" | ")}` : "");
  await logRun(errors.length < Math.max(3, toCheck.length / 3), msg, { collected: cands.length, checked: toCheck.length, hot, weak, saved, errors: errors.length });
  return { collected: cands.length, checked: toCheck.length, hot, weak, saved, errors };
}

Deno.serve(async (req) => {
  try {
    const cron = await secret("mm_cron_secret");
    if (!cron || req.headers.get("x-mm-cron") !== cron) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: H });
    return new Response(JSON.stringify({ ok: true, ...(await run()) }), { headers: H });
  } catch (e) {
    console.error(e);
    await logRun(false, String((e as Error)?.message || e)).catch(() => {});
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500, headers: H });
  }
});

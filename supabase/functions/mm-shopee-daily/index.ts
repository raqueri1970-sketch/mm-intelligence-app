// MM · Shopee Afiliado — mineração diária + sincronização de conversões.
// Disparado pelo pg_cron com o header x-mm-cron (segredo do cofre). As chamadas à Shopee passam pelo app
// (mm-intelligence-app.vercel.app/api/shopee/*), que usa as chaves da Vercel ou do cofre (ponte mm-shopee-api).
import postgres from "npm:postgres@3.4.3";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const APP = "https://mm-intelligence-app.vercel.app";
const H = { "Content-Type": "application/json" };
const TOP_PER_KEYWORD = 20;
const CONCURRENCY = 4;
const RETRIES = 2; // a Shopee devolve "System Error [10000]" de vez em quando; tenta de novo com espera

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cronSecret(): Promise<string> {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'mm_cron_secret'`;
  return r[0]?.decrypted_secret || "";
}
async function logRun(kind: string, ok: boolean, message: string, counts: Record<string, unknown> = {}) {
  await sql`insert into public.mm_shopee_runs (kind, ok, message, counts) values (${kind}, ${ok}, ${message}, ${sql.json(counts)})`;
}

async function fetchKeyword(keyword: string) {
  let last: Error = new Error("sem resposta");
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt) await sleep(2500 * attempt);
    try {
      const r = await fetch(`${APP}/api/shopee/products?q=${encodeURIComponent(keyword)}&sort=2`);
      const j = await r.json();
      if (r.ok) return j;
      last = new Error(j.error || `HTTP ${r.status}`);
      if (r.status === 503) break; // chaves ausentes: não adianta repetir
    } catch (e) { last = e as Error; }
  }
  throw last;
}

async function mineKeyword(keyword: string) {
  const j = await fetchKeyword(keyword);
  const rows = (j.items || []).slice(0, TOP_PER_KEYWORD).map((p: any) => ({
    keyword, item_id: p.id, name: p.name, shop: p.shop || null, price: p.price, sales: p.sales, rating: p.rating,
    commission_rate: p.commissionRate, commission: p.commission, score: p.score, image: p.image || null,
    product_link: p.productLink || null, affiliate_link: p.affiliateLink || null,
  }));
  // remove duplicados dentro do lote (mesmo item em palavras diferentes no mesmo dia)
  const uniq = [...new Map(rows.map((x: any) => [x.item_id, x])).values()];
  if (uniq.length) await sql`insert into public.mm_shopee_offers ${sql(uniq as any[], 'keyword','item_id','name','shop','price','sales','rating','commission_rate','commission','score','image','product_link','affiliate_link')}
    on conflict (run_date, item_id) do update set sales = excluded.sales, price = excluded.price, commission = excluded.commission,
      commission_rate = excluded.commission_rate, score = greatest(public.mm_shopee_offers.score, excluded.score),
      affiliate_link = excluded.affiliate_link, collected_at = now()`;
  return uniq.length;
}

async function mine() {
  const kws: string[] = (await sql`select keyword from public.mm_shopee_keywords where active order by keyword`).map((x: any) => x.keyword);
  let saved = 0; const errors: string[] = [];
  for (let i = 0; i < kws.length; i += CONCURRENCY) {
    const batch = kws.slice(i, i + CONCURRENCY);
    const res = await Promise.allSettled(batch.map(mineKeyword));
    res.forEach((r, k) => { if (r.status === "fulfilled") saved += r.value; else errors.push(`${batch[k]}: ${(r.reason as Error)?.message}`); });
  }
  await logRun("mine", errors.length === 0, errors.length ? `${saved} ofertas; erros: ` + errors.slice(0, 4).join(" | ") : `ok: ${saved} ofertas de ${kws.length} palavras`, { keywords: kws.length, saved, errors: errors.length });
  return { keywords: kws.length, saved, errors };
}

async function conversions(secret: string, days: number) {
  const r = await fetch(`${APP}/api/shopee/conversions?days=${days}`, { headers: { "x-mm-cron": secret } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { await logRun("conversions", false, j.error || `HTTP ${r.status}`); return { error: j.error, status: r.status }; }
  const rows = (j.rows || []).filter((c: any) => c.conversion_id).map((c: any) => ({ ...c, raw: sql.json(c.raw || {}) }));
  if (rows.length) await sql`insert into public.mm_shopee_conversions ${sql(rows, 'conversion_id','item_id','purchase_time','item_name','order_status','qty','item_price','commission','sub1','sub2','sub3','sub4','sub5','raw')}
    on conflict (conversion_id, item_id) do update set order_status = excluded.order_status, commission = excluded.commission, synced_at = now()`;
  await logRun("conversions", true, `ok: ${rows.length} itens de conversão (${days} dias)`, { saved: rows.length, days });
  return { saved: rows.length };
}

Deno.serve(async (req) => {
  try {
    const secret = await cronSecret();
    if (!secret || req.headers.get("x-mm-cron") !== secret) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: H });
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || "all");
    const st = await fetch(`${APP}/api/shopee/status`).then((r) => r.json()).catch(() => ({ configured: false }));
    if (!st.configured) {
      await logRun(action, false, "aguardando as chaves da Open API da Shopee");
      return new Response(JSON.stringify({ ok: true, waiting: true }), { headers: H });
    }
    const out: Record<string, unknown> = {};
    // relatório primeiro (rápido), depois a mineração
    if (action === "all" || action === "conversions") out.conversions = await conversions(secret, Math.min(30, Number(b.days) || 7));
    if (action === "all" || action === "mine") out.mine = await mine();
    return new Response(JSON.stringify({ ok: true, ...out }), { headers: H });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500, headers: H });
  }
});

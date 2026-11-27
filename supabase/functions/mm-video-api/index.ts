// MM · Vídeos para Reels do @kliccasa (sistema híbrido: vídeo enviado no painel + vídeo gerado das fotos).
// Quem chama:
//   Painel (/shopee/instagram, chave publishable no header apikey):
//     {action:"products"}                         → produtos recentes da fila do Grupo VIP, para escolher no envio
//     {action:"upload-url", filename}             → URL assinada para subir o vídeo bruto (pasta raw/)
//     {action:"submit", item_id, path, caption_extra?} → coloca o vídeo na fila de edição (status "editar")
//     {action:"cancel", id}                       → tira um vídeo da fila
//     {action:"from-link", url}                   → produto de qualquer link da Shopee (vira opção no envio de vídeo)
//     {action:"post-now", item_id}                → publica agora a foto do produto no @kliccasa (até 10 por dia)
//   Editor automático (GitHub Actions do repositório mm-intelligence-app, token OIDC do GitHub; ou x-mm-cron):
//     {action:"jobs"}                             → pega vídeos enviados para editar + produtos para gerar Reel das fotos
//     {action:"final-url", id}                    → URLs assinadas para subir o vídeo final e a capa
//     {action:"done", id}                         → vídeo pronto para publicar (status "pronto")
//     {action:"fail", id, error}                  → registra a falha (tenta de novo até 3 vezes)
// Nenhuma chave fica no GitHub: o editor se identifica com o token OIDC que o próprio GitHub emite para o workflow.
import postgres from "npm:postgres@3.4.3";
import { createClient } from "npm:@supabase/supabase-js@2.105.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const storage = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }).storage.from("mm-videos");
const BUCKET_PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/mm-videos/`;
const GH_ISSUER = "https://token.actions.githubusercontent.com";
const GH_REPO = "raqueri1970-sketch/mm-intelligence-app";
const GH_AUDIENCE = "mm-video-api";
const jwks = createRemoteJWKSet(new URL(`${GH_ISSUER}/.well-known/jwks`));
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function flat(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(flat);
  if (v && typeof v === "object") return Object.values(v).flatMap(flat);
  return [];
}
async function secret(name: string) {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name}`;
  return String(r[0]?.decrypted_secret || "").trim();
}
async function isPanel(req: Request) {
  const key = req.headers.get("apikey") || "";
  if (!key) return false;
  const pubs = [...flat(JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}")), await secret("mm_publishable_key"), Deno.env.get("SUPABASE_ANON_KEY") || ""].filter(Boolean);
  return pubs.includes(key);
}
async function isEditor(req: Request) {
  const cron = req.headers.get("x-mm-cron");
  if (cron) { const s = await secret("mm_cron_secret"); return !!s && cron === s; }
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  try {
    const { payload } = await jwtVerify(auth.slice(7), jwks, { issuer: GH_ISSUER, audience: GH_AUDIENCE });
    return payload.repository === GH_REPO;
  } catch { return false; }
}
async function logRun(kind: string, ok: boolean, message: string, counts: Record<string, unknown> = {}) {
  await sql`insert into public.mm_shopee_runs (kind, ok, message, counts) values (${kind}, ${ok}, ${message}, ${sql.json(counts)})`;
}
// primeira linha da mensagem do Grupo VIP vira o gancho do vídeo (sem emoji, que o editor não desenha)
const hookFrom = (msg: string | null, name: string) => {
  const line = String(msg || "").split("\n").map((l) => l.replace(/[^\p{L}\p{N}\s.,!?%$:+\-/]/gu, "").replace(/\s+/g, " ").trim()).find((l) => l.length >= 8) || "";
  return (line || name).slice(0, 70);
};

// ---------- painel ----------
async function products() {
  return await sql`
    select distinct on (q.item_id) q.item_id::text item_id, q.name, q.image, q.price::float8 price, q.keyword, q.slot_at
      from public.mm_vip_queue q
     where q.created_at > now() - interval '4 days' and q.status <> 'cancelado'
     order by q.item_id, q.created_at desc`.then((r) => [...r].sort((a: any, b: any) => +new Date(b.slot_at) - +new Date(a.slot_at)).slice(0, 80));
}
async function uploadUrl(b: any) {
  const ext = /\.mov$/i.test(String(b.filename || "")) ? "mov" : "mp4";
  const path = `raw/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, token: data.token, signedUrl: data.signedUrl };
}
async function submit(b: any) {
  const itemId = String(b.item_id || "");
  const path = String(b.path || "");
  if (!/^\d+$/.test(itemId)) throw new Error("escolha o produto");
  if (!/^raw\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(mp4|mov)$/.test(path)) throw new Error("arquivo inválido");
  const [p] = await sql`select name from public.mm_vip_queue where item_id = ${itemId} order by created_at desc limit 1`;
  if (!p) throw new Error("produto não encontrado; busque pelo link de novo");
  const dir = path.split("/").slice(0, 2).join("/");
  const { data: files } = await storage.list(dir, { search: path.split("/")[2] });
  if (!files?.length) throw new Error("o vídeo não chegou no armazenamento; envie de novo");
  const extra = b.caption_extra ? String(b.caption_extra).slice(0, 300) : null;
  const [row] = await sql`insert into public.mm_ig_videos (item_id, source, raw_path, name, caption_extra, status)
    values (${itemId}, 'manual', ${path}, ${p.name}, ${extra}, 'editar') returning id`;
  return { id: row.id };
}
async function cancel(b: any) {
  await sql`update public.mm_ig_videos set status = 'cancelado', updated_at = now() where id = ${Number(b.id)} and status in ('editar','pronto','erro')`;
  return { ok: true };
}

// ---------- produto escolhido pelo link ----------
const APP = "https://mm-intelligence-app.vercel.app";
// tira o ID do item de links como shopee.com.br/Nome-i.SHOP.ITEM, /product/SHOP/ITEM, /opaanlp/SHOP/ITEM ou s.shopee.com.br/xxxx (segue o redirecionamento)
async function itemIdFrom(raw: string) {
  let url = raw.trim();
  for (let hop = 0; hop < 6; hop++) {
    const dec = (() => { try { return decodeURIComponent(decodeURIComponent(url)); } catch { return url; } })();
    const m = dec.match(/-i\.(\d+)\.(\d+)/) || dec.match(/shopee\.com\.br\/[a-z-]+\/(\d{4,})\/(\d{6,})/i) || dec.match(/[?&]itemid=(\d+)/i);
    if (m) return m[2] ?? m[1];
    if (!/^https?:\/\//.test(url)) break;
    const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Mozilla/5.0" } });
    const loc = r.headers.get("location");
    if (!loc) {
      const html = await r.text().catch(() => "");
      const h = html.match(/-i\.(\d+)\.(\d+)/) || html.match(/shopee\.com\.br\/[a-z-]+\/(\d{4,})\/(\d{6,})/i);
      if (h) return h[2];
      break;
    }
    url = new URL(loc, url).toString();
  }
  throw new Error("não achei o produto nesse link; cole o link do produto da Shopee");
}
async function fromLink(b: any) {
  const raw = String(b.url || "").trim();
  if (!/^https:\/\/([a-z0-9-]+\.)*(shopee\.com\.br|shope\.ee)\//i.test(raw)) throw new Error("cole um link da Shopee Brasil");
  const itemId = await itemIdFrom(raw);
  const [have] = await sql`select item_id::text item_id, name, image, price::float8 price, keyword from public.mm_vip_queue
    where item_id = ${itemId} and created_at > now() - interval '4 days' order by created_at desc limit 1`;
  if (have) return have;
  const r = await fetch(`${APP}/api/shopee/item?id=${itemId}`, { signal: AbortSignal.timeout(30000) });
  const p = await r.json().catch(() => ({}));
  if (!r.ok || !p.item_id) throw new Error(p.error || `Shopee HTTP ${r.status}`);
  let link = p.affiliate_link;
  try {
    const s = await fetch(`${APP}/api/shopee/shortlink`, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: p.product_link || raw, subIds: ["insta", "link", String(itemId)] }), signal: AbortSignal.timeout(30000) });
    const sj = await s.json().catch(() => ({}));
    if (s.ok && sj.shortLink) link = sj.shortLink;
  } catch { /* fica o offerLink */ }
  if (!link) throw new Error("a Shopee não gerou o link desse produto");
  // fica numa fila à parte (niche "insta"): não entra no Grupo VIP nem nos posts automáticos
  const [row] = await sql`insert into public.mm_vip_queue (niche, item_id, keyword, name, image, price, sales, rating, commission, commission_rate,
      product_link, affiliate_link, message, slot_at, status)
    values ('insta', ${itemId}, 'link', ${p.name}, ${p.image || null}, ${p.price}, ${p.sales}, ${p.rating}, ${p.commission}, ${p.commission_rate},
      ${p.product_link || raw}, ${link}, ${p.name}, now(), 'manual')
    returning item_id::text item_id, name, image, price::float8 price, keyword`;
  return row;
}
async function postNow(b: any) {
  const itemId = String(b.item_id || "");
  if (!/^\d+$/.test(itemId)) throw new Error("escolha o produto");
  const [{ n }] = await sql`select count(*)::int n from public.mm_shopee_runs where kind = 'ig-post-link' and ok and ran_at > now() - interval '1 day'`;
  if (n >= 10) throw new Error("limite de 10 posts manuais por dia atingido");
  const cron = await secret("mm_cron_secret");
  const r = await fetch(`${SUPABASE_URL}/functions/v1/mm-instagram`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-mm-cron": cron },
    body: JSON.stringify({ action: "post", force: true, type: "foto", item_id: itemId }), signal: AbortSignal.timeout(120000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(j.error || `Instagram HTTP ${r.status}`);
  if (!j.posted) throw new Error(j.skipped || "não publicou");
  await logRun("ig-post-link", true, `foto publicada pelo link: ${j.name}`, { media_id: j.posted, item_id: itemId });
  return { posted: j.posted, permalink: j.permalink, name: j.name };
}

// ---------- editor ----------
async function jobs() {
  // destrava edições que ficaram presas (workflow caiu no meio)
  await sql`update public.mm_ig_videos set status = case when source = 'manual' then 'editar' else 'erro' end,
      error = coalesce(error, 'edição interrompida'), updated_at = now()
    where status = 'editando' and updated_at < now() - interval '45 minutes'`;
  const manual = await sql`
    update public.mm_ig_videos v set status = 'editando', attempts = attempts + 1, updated_at = now()
     where v.id in (select id from public.mm_ig_videos where status = 'editar' and source = 'manual' order by created_at limit 3 for update skip locked)
    returning v.id, v.item_id::text item_id, v.raw_path`;
  const out: any[] = [];
  for (const m of manual) {
    const o = await productInfo(m.item_id);
    const { data } = await storage.createSignedUrl(m.raw_path, 3600);
    out.push({ id: m.id, kind: "manual", raw_url: data?.signedUrl, ...o });
  }
  // Reels automáticos: mantém um vídeo pronto para cada horário de Reel
  const [c] = await sql`select reel_slots from public.mm_ig_config where id = 1`;
  const want = Math.min(3, (c?.reel_slots || []).length);
  const [{ n }] = await sql`select count(*)::int n from public.mm_ig_videos where source = 'auto' and status in ('editando','pronto','processando')`;
  const need = Math.max(0, want - n);
  if (need > 0) {
    const picks = await sql`
      select q.item_id::text item_id from public.mm_vip_queue q
       where q.niche = 'casa' and q.status <> 'cancelado' and q.image is not null
         and (q.slot_at at time zone 'America/Sao_Paulo')::date between (now() at time zone 'America/Sao_Paulo')::date and (now() at time zone 'America/Sao_Paulo')::date + 1
         and not exists (select 1 from public.mm_ig_posts p where p.item_id = q.item_id and p.posted_at > now() - interval '10 days')
         and not exists (select 1 from public.mm_ig_videos v where v.item_id = q.item_id and (v.status in ('editar','editando','pronto','processando') or (v.status = 'publicado' and v.updated_at > now() - interval '10 days') or (v.source = 'auto' and v.status = 'erro' and v.updated_at > now() - interval '1 day')))
       group by q.item_id order by max(q.commission) desc, max(q.sales) desc limit ${need}`;
    for (const pk of picks) {
      const o = await productInfo(pk.item_id);
      const ins = await sql`insert into public.mm_ig_videos (item_id, source, name, status, attempts) values (${pk.item_id}, 'auto', ${o.name}, 'editando', 1)
        on conflict do nothing returning id`;
      if (ins.length) out.push({ id: ins[0].id, kind: "auto", ...o });
    }
  }
  return { jobs: out };
}
async function productInfo(itemId: string) {
  const [o] = await sql`select q.item_id::text item_id, q.name, q.image, q.price::float8 price, q.sales, q.rating::float8 rating, q.keyword, q.message
    from public.mm_vip_queue q where q.item_id = ${itemId} order by q.created_at desc limit 1`;
  if (!o) return { item_id: itemId, name: "", image: null, price: 0, sales: 0, rating: 0, hook: "" };
  return { item_id: o.item_id, name: o.name, image: o.image, price: o.price, sales: o.sales, rating: o.rating, hook: hookFrom(o.message, o.name) };
}
async function finalUrl(b: any) {
  const id = Number(b.id);
  const [v] = await sql`select id from public.mm_ig_videos where id = ${id} and status = 'editando'`;
  if (!v) throw new Error("vídeo não está em edição");
  const video = await storage.createSignedUploadUrl(`final/${id}.mp4`, { upsert: true });
  const cover = await storage.createSignedUploadUrl(`final/${id}.jpg`, { upsert: true });
  if (video.error || cover.error) throw new Error(video.error?.message || cover.error?.message);
  return { video: video.data.signedUrl, cover: cover.data.signedUrl };
}
async function done(b: any) {
  const id = Number(b.id);
  const v = Date.now();
  const [r] = await sql`update public.mm_ig_videos set status = 'pronto', error = null,
      video_url = ${`${BUCKET_PUBLIC}final/${id}.mp4?v=${v}`}, cover_url = ${`${BUCKET_PUBLIC}final/${id}.jpg?v=${v}`}, updated_at = now()
    where id = ${id} and status = 'editando' returning source, name`;
  if (!r) throw new Error("vídeo não está em edição");
  await logRun("ig-video", true, `vídeo pronto (${r.source === "manual" ? "enviado" : "gerado das fotos"}): ${r.name}`, { video_id: id });
  return { ok: true };
}
async function fail(b: any) {
  const id = Number(b.id);
  const err = String(b.error || "falha na edição").slice(0, 500);
  const [r] = await sql`update public.mm_ig_videos set
      status = case when source = 'manual' and attempts < 3 then 'editar' else 'erro' end, error = ${err}, updated_at = now()
    where id = ${id} and status = 'editando' returning status, name`;
  if (r?.status === "erro") await logRun("ig-video", false, `vídeo com erro: ${r.name} — ${err}`, { video_id: id });
  return { ok: true, status: r?.status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "use POST" }, 405);
  try {
    const b = await req.json().catch(() => ({}));
    const panelActions: Record<string, (b: any) => Promise<unknown>> = { products, "upload-url": uploadUrl, submit, cancel, "from-link": fromLink, "post-now": postNow };
    const editorActions: Record<string, (b: any) => Promise<unknown>> = { jobs, "final-url": finalUrl, done, fail };
    if (panelActions[b.action]) {
      if (!(await isPanel(req)) && !(await isEditor(req))) return json({ error: "unauthorized" }, 401);
      return json(await panelActions[b.action](b));
    }
    if (editorActions[b.action]) {
      if (!(await isEditor(req))) return json({ error: "unauthorized" }, 401);
      return json(await editorActions[b.action](b));
    }
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 400);
  }
});

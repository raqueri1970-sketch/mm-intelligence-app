// MM · Instagram automático (@kliccasa) pela API da Meta (login do Facebook).
//   POST {action:"setup"}  (x-mm-cron): troca o token curto do cofre (mm_meta_user_token) por um token de página
//                          que não expira, acha a página e o Instagram ligados, assina os webhooks de comentários.
//   POST {action:"post"}   (x-mm-cron): publica no feed a melhor oferta do dia ainda não postada (foto + legenda).
//   GET  ?hub.challenge    (Meta): confirmação do webhook.
//   POST (Meta, assinado): comentário novo → se for "EU QUERO", manda o link no direct e responde no post.
// Segredos só no cofre: mm_meta_app_secret, mm_meta_user_token, mm_meta_page_token, mm_ig_verify_token, mm_cron_secret.
import postgres from "npm:postgres@3.4.3";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const GRAPH = "https://graph.facebook.com/v27.0";
const APP = "https://mm-intelligence-app.vercel.app";
const H = { "Content-Type": "application/json" };
const WANT = /\b(eu\s*quero|quero|link|eu\s*qro|qro|onde\s+compr|manda)\b/i;
const PUBLIC_REPLIES = ["Te mandei no direct! 📩", "Enviei o link no seu direct 😉", "Já tá no seu direct! 🎄", "Mandei no direct, corre que acaba! 🛒"];

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: H });
async function secret(name: string) {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name}`;
  return (r[0]?.decrypted_secret as string) || "";
}
async function putSecret(name: string, value: string) {
  const r = await sql`select id from vault.secrets where name = ${name}`;
  if (r.length) await sql`select vault.update_secret(${r[0].id}::uuid, ${value})`;
  else await sql`select vault.create_secret(${value}, ${name})`;
}
async function logRun(kind: string, ok: boolean, message: string, counts: Record<string, unknown> = {}) {
  await sql`insert into public.mm_shopee_runs (kind, ok, message, counts) values (${kind}, ${ok}, ${message}, ${sql.json(counts)})`;
}
async function graph(path: string, params: Record<string, string> = {}, method = "GET") {
  const url = new URL(path.startsWith("http") ? path : GRAPH + path);
  const init: RequestInit = { method, signal: AbortSignal.timeout(30000) };
  if (method === "GET") for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  else { init.body = new URLSearchParams(params); init.headers = { "Content-Type": "application/x-www-form-urlencoded" }; }
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.error_user_msg || j.error?.message || `Meta HTTP ${r.status}`);
  return j;
}
async function config() {
  const [c] = await sql`select * from public.mm_ig_config where id = 1`;
  return c as any;
}
async function setError(msg: string | null) {
  await sql`update public.mm_ig_config set last_error = ${msg}, updated_at = now() where id = 1`;
}

// ---------- configuração ----------
async function setup() {
  const c = await config();
  const appSecret = await secret("mm_meta_app_secret");
  const userToken = await secret("mm_meta_user_token");
  if (!appSecret || !userToken) throw new Error("faltam no cofre: mm_meta_app_secret e/ou mm_meta_user_token");
  // 1. token de usuário de 60 dias (se a Meta não aceitar a troca, como em tokens de usuário do sistema, usa o próprio token)
  let baseToken = userToken;
  try {
    const long = await graph("/oauth/access_token", { grant_type: "fb_exchange_token", client_id: c.app_id, client_secret: appSecret, fb_exchange_token: userToken });
    if (long.access_token) baseToken = long.access_token;
  } catch { /* segue com o token original */ }
  // 2. tokens de página (derivados de um token longo, não expiram)
  const pages = await graph("/me/accounts", { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50", access_token: baseToken });
  const list = (pages.data || []) as any[];
  const page = list.find((p) => p.instagram_business_account?.username?.toLowerCase() === "kliccasa") ?? list.find((p) => p.instagram_business_account);
  if (!page) throw new Error(`nenhuma página com Instagram ligado (páginas vistas: ${list.map((p) => p.name).join(", ") || "nenhuma"})`);
  await putSecret("mm_meta_page_token", page.access_token);
  // 3. webhooks: a página instala o app e o app assina comentários do Instagram
  let verify = await secret("mm_ig_verify_token");
  if (!verify) { verify = crypto.randomUUID().replace(/-/g, ""); await putSecret("mm_ig_verify_token", verify); }
  await graph(`/${page.id}/subscribed_apps`, { subscribed_fields: "feed", access_token: page.access_token }, "POST");
  const projectUrl = await secret("mm_project_url");
  let webhookOk = false, webhookErr = "";
  try {
    await graph(`/${c.app_id}/subscriptions`, {
      object: "instagram", callback_url: `${projectUrl}/functions/v1/mm-instagram`, fields: "comments", verify_token: verify,
      access_token: `${c.app_id}|${appSecret}`,
    }, "POST");
    webhookOk = true;
  } catch (e) { webhookErr = (e as Error).message; }
  await sql`update public.mm_ig_config set page_id = ${page.id}, page_name = ${page.name}, ig_user_id = ${page.instagram_business_account.id},
    ig_username = ${page.instagram_business_account.username}, connected_at = now(), webhook_ok = ${webhookOk},
    last_error = ${webhookErr ? `webhook: ${webhookErr}` : null}, updated_at = now() where id = 1`;
  // o token curto já cumpriu o papel
  await putSecret("mm_meta_user_token", "usado");
  const msg = `conectado: página ${page.name} + Instagram @${page.instagram_business_account.username}` + (webhookOk ? "; respostas EU QUERO ligadas" : `; webhook falhou: ${webhookErr}`);
  await logRun("ig-setup", webhookOk, msg);
  return { page: page.name, instagram: page.instagram_business_account.username, webhookOk, webhookErr };
}

// ---------- post no feed ----------
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const clean = (n: string) => { const t = n.replace(/\s+/g, " ").trim(); return t.length > 90 ? t.slice(0, 90).replace(/\s+\S*$/, "") + "…" : t; };
function caption(o: any) {
  const xmas = /natal|noel|natalin|reveillon/i.test(`${o.keyword} ${o.name}`);
  const tags = xmas
    ? "#achadinhos #achadinhosshopee #shopee #natal #decoracaodenatal #natal2026 #arvoredenatal #casadecorada #promocao"
    : "#achadinhos #achadinhosshopee #shopee #achadinhosdecasa #casaorganizada #utilidadesdomesticas #promocao";
  return [
    `${xmas ? "🎄" : "🏠"} ${clean(o.name)}`, ``,
    `💰 ${brl(o.price)}${Number(o.rating) >= 4 ? ` · ⭐ ${Number(o.rating).toFixed(1).replace(".", ",")}` : ""} · ${Number(o.sales).toLocaleString("pt-BR")} vendidos`, ``,
    `💬 Comente EU QUERO que eu te mando o link no direct`,
    `🔗 Ou entre no Grupo VIP pelo link do perfil: ofertas o dia todo`, ``, tags,
  ].join("\n");
}
async function shortLink(url: string, subIds: string[]) {
  const r = await fetch(`${APP}/api/shopee/shortlink`, { method: "POST", headers: H, body: JSON.stringify({ url, subIds }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.shortLink) throw new Error(j.error || `shortlink HTTP ${r.status}`);
  return j.shortLink as string;
}
async function post(force = false) {
  const c = await config();
  if (!c.ig_user_id) return { skipped: "Instagram ainda não conectado" };
  if (!c.posting_enabled && !force) return { skipped: "posts automáticos desligados no painel" };
  const token = await secret("mm_meta_page_token");
  // melhor oferta do dia (fila do Grupo VIP) que ainda não foi para o Instagram nos últimos 10 dias
  const [o] = await sql`
    select q.item_id, q.keyword, q.name, q.image, q.price::float8 price, q.sales, q.rating::float8 rating, q.product_link, q.affiliate_link
      from public.mm_vip_queue q
     where q.niche = 'casa' and q.status <> 'cancelado' and q.image is not null
       and (q.slot_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
       and not exists (select 1 from public.mm_ig_posts p where p.item_id = q.item_id and p.posted_at > now() - interval '10 days')
     order by q.commission desc, q.sales desc limit 1`;
  if (!o) return { skipped: "nenhuma oferta nova na fila de hoje" };
  let link = o.affiliate_link;
  if (o.product_link) { try { link = await shortLink(o.product_link, ["insta", "post", String(o.item_id)]); } catch { /* fica o link do grupo */ } }
  const cap = caption(o);
  const created = await graph(`/${c.ig_user_id}/media`, { image_url: o.image, caption: cap, access_token: token }, "POST");
  // a Meta processa a foto antes de publicar
  for (let i = 0; i < 10; i++) {
    const st = await graph(`/${created.id}`, { fields: "status_code", access_token: token });
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("a Meta recusou a foto do produto");
    await new Promise((r) => setTimeout(r, 3000));
  }
  const pub = await graph(`/${c.ig_user_id}/media_publish`, { creation_id: created.id, access_token: token }, "POST");
  const info = await graph(`/${pub.id}`, { fields: "permalink", access_token: token }).catch(() => ({}));
  await sql`insert into public.mm_ig_posts (media_id, item_id, keyword, name, image, price, link, caption, permalink)
    values (${pub.id}, ${o.item_id}, ${o.keyword}, ${o.name}, ${o.image}, ${o.price}, ${link}, ${cap}, ${info.permalink ?? null})`;
  await setError(null);
  await logRun("ig-post", true, `post publicado: ${clean(o.name)}`, { media_id: pub.id });
  return { posted: pub.id, name: o.name, permalink: info.permalink };
}

// ---------- comentários (webhook da Meta) ----------
async function validSignature(raw: string, header: string | null) {
  const appSecret = await secret("mm_meta_app_secret");
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
async function onComment(v: any) {
  const commentId = String(v.id || ""), mediaId = String(v.media?.id || ""), text = String(v.text || "");
  const username = String(v.from?.username || "");
  if (!commentId || !WANT.test(text)) return;
  const c = await config();
  if (username && c.ig_username && username.toLowerCase() === String(c.ig_username).toLowerCase()) return; // não responde a si mesmo
  const ins = await sql`insert into public.mm_ig_replies (comment_id, media_id, username, text) values (${commentId}, ${mediaId}, ${username}, ${text})
    on conflict do nothing returning comment_id`;
  if (!ins.length) return; // já respondido
  const token = await secret("mm_meta_page_token");
  const [p] = await sql`select name, link from public.mm_ig_posts where media_id = ${mediaId}`;
  const [vip] = await sql`select group_link from public.mm_vip_settings where niche = 'casa'`;
  const lines = [c.reply_text];
  if (p) lines.push(``, `🛒 ${clean(p.name)}`, `👉 ${p.link}`);
  if (vip?.group_link) lines.push(``, `🎁 Mais ofertas todo dia no Grupo VIP: ${vip.group_link}`);
  lines.push(``, `(link de afiliado: posso ganhar comissão, sem custo a mais pra você)`);
  let errs: string[] = [];
  try {
    await graph(`/${c.page_id}/messages`, { recipient: JSON.stringify({ comment_id: commentId }), message: JSON.stringify({ text: lines.join("\n") }), access_token: token }, "POST");
    await sql`update public.mm_ig_replies set replied_private = true where comment_id = ${commentId}`;
  } catch (e) { errs.push(`direct: ${(e as Error).message}`); }
  try {
    await graph(`/${commentId}/replies`, { message: PUBLIC_REPLIES[Math.floor(Math.random() * PUBLIC_REPLIES.length)], access_token: token }, "POST");
    await sql`update public.mm_ig_replies set replied_public = true where comment_id = ${commentId}`;
  } catch (e) { errs.push(`comentário: ${(e as Error).message}`); }
  if (errs.length) await sql`update public.mm_ig_replies set error = ${errs.join(" | ")} where comment_id = ${commentId}`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  try {
    // confirmação do webhook (Meta)
    if (req.method === "GET") {
      const verify = await secret("mm_ig_verify_token");
      if (verify && url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verify)
        return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
      return new Response("forbidden", { status: 403 });
    }
    const raw = await req.text();
    // chamadas internas (cron / configuração)
    if (req.headers.get("x-mm-cron")) {
      const cron = await secret("mm_cron_secret");
      if (!cron || req.headers.get("x-mm-cron") !== cron) return json({ ok: false, error: "unauthorized" }, 401);
      const b = raw ? JSON.parse(raw) : {};
      try {
        if (b.action === "setup") return json({ ok: true, ...(await setup()) });
        if (b.action === "post") {
          const c = await config();
          // só posta nos horários configurados (o cron roda de hora em hora)
          const now = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(11, 13) + ":00";
          if (!b.force && !(c.post_slots || []).includes(now)) return json({ ok: true, skipped: `fora do horário (${now})` });
          return json({ ok: true, ...(await post(Boolean(b.force))) });
        }
        return json({ ok: false, error: "ação desconhecida" }, 400);
      } catch (e) {
        const m = (e as Error).message;
        await setError(m); await logRun(`ig-${b.action}`, false, m);
        return json({ ok: false, error: m }, 500);
      }
    }
    // eventos da Meta
    if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) return new Response("bad signature", { status: 401 });
    const body = JSON.parse(raw || "{}");
    if (body.object === "instagram") {
      for (const entry of body.entry || []) for (const ch of entry.changes || []) if (ch.field === "comments") await onComment(ch.value || {});
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});

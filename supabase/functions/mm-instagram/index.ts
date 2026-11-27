// MM · Instagram automático (@kliccasa) pela API da Meta (login do Facebook).
//   POST {action:"setup"}  (x-mm-cron): troca o token curto do cofre (mm_meta_user_token) por um token de página
//                          que não expira, acha a página e o Instagram ligados, assina os webhooks de comentários.
//   POST {action:"post"}   (x-mm-cron): HÍBRIDO — nos horários de Reel (mm_ig_config.reel_slots) publica um vídeo
//                          pronto de mm_ig_videos (o enviado no painel tem prioridade sobre o gerado das fotos);
//                          nos outros horários, ou sem vídeo pronto, publica foto + legenda.
//                          Fora do horário só termina Reels que a Meta ainda estava processando.
//   POST {action:"poll"}   (x-mm-cron, a cada 2 min): lê os comentários dos posts dos últimos 7 dias e responde os "EU QUERO".
//   Facebook: se mm_ig_config.fb_enabled, cada foto/Reel publicado no Instagram também sai na página (link de compra
//             direto na legenda); falha no Facebook fica em mm_ig_posts.fb_error e não derruba o Instagram.
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
  if (!appSecret || !userToken || userToken === "usado") throw new Error("faltam no cofre: mm_meta_app_secret e/ou mm_meta_user_token (token novo)");
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

// ---------- legenda e link ----------
const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const clean = (n: string) => { const t = String(n || "").replace(/\s+/g, " ").trim(); return t.length > 90 ? t.slice(0, 90).replace(/\s+\S*$/, "") + "…" : t; };
function caption(o: any, extra?: string | null) {
  const xmas = /natal|noel|natalin|reveillon/i.test(`${o.keyword} ${o.name}`);
  const tags = xmas
    ? "#achadinhos #achadinhosshopee #shopee #natal #decoracaodenatal #natal2026 #arvoredenatal #casadecorada #promocao"
    : "#achadinhos #achadinhosshopee #shopee #achadinhosdecasa #casaorganizada #utilidadesdomesticas #promocao";
  const head = [`${xmas ? "🎄" : "🏠"} ${clean(o.name)}`];
  if (extra) head.push(``, String(extra).trim());
  return [
    ...head, ``,
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
async function linkFor(o: any, kind: string) {
  let link = o.affiliate_link;
  if (o.product_link) { try { link = await shortLink(o.product_link, ["insta", kind, String(o.item_id)]); } catch { /* fica o link do grupo */ } }
  return link;
}
// dados do produto: última aparição na fila do Grupo VIP
async function product(itemId: number | string) {
  const [o] = await sql`
    select q.item_id, q.keyword, q.name, q.image, q.price::float8 price, q.sales, q.rating::float8 rating, q.product_link, q.affiliate_link
      from public.mm_vip_queue q where q.item_id = ${itemId} order by q.created_at desc limit 1`;
  return o as any;
}

// ---------- página do Facebook (mesmo conteúdo, link de compra direto; liga/desliga em mm_ig_config.fb_enabled) ----------
async function fbCaption(o: any, link: string, extra?: string | null) {
  const [vip] = await sql`select group_link from public.mm_vip_settings where niche = 'casa'`;
  const xmas = /natal|noel|natalin|reveillon/i.test(`${o.keyword} ${o.name}`);
  const lines = [`${xmas ? "🎄" : "🏠"} ${clean(o.name)}`];
  if (extra) lines.push(``, String(extra).trim());
  lines.push(``, `💰 ${brl(o.price)}${Number(o.rating) >= 4 ? ` · ⭐ ${Number(o.rating).toFixed(1).replace(".", ",")}` : ""} · ${Number(o.sales).toLocaleString("pt-BR")} vendidos`);
  if (link) lines.push(``, `🛒 Compre aqui: ${link}`);
  if (vip?.group_link) lines.push(`🎁 Ofertas todo dia no Grupo VIP: ${vip.group_link}`);
  lines.push(``, `(link de afiliado: posso ganhar comissão, sem custo a mais pra você)`);
  return lines.join("\n");
}
// Publica na página depois do Instagram. Falha aqui nunca derruba o post do Instagram: fica em mm_ig_posts.fb_error.
async function publishFacebook(c: any, token: string, mediaId: string, kind: "IMAGE" | "REELS", o: any, link: string, url: string, extra?: string | null) {
  if (!c.fb_enabled || !c.page_id) return null;
  try {
    const message = await fbCaption(o, link, extra);
    let postId: string;
    if (kind === "IMAGE") {
      const r = await graph(`/${c.page_id}/photos`, { url, caption: message, published: "true", access_token: token }, "POST");
      postId = String(r.post_id || r.id);
    } else {
      // Reels da página: start → upload por URL (rupload) → finish publicado
      const start = await graph(`/${c.page_id}/video_reels`, { upload_phase: "start", access_token: token }, "POST");
      const up = await fetch(`https://rupload.facebook.com/video-upload/v27.0/${start.video_id}`, {
        method: "POST", headers: { Authorization: `OAuth ${token}`, file_url: url }, signal: AbortSignal.timeout(60000),
      });
      const uj = await up.json().catch(() => ({}));
      if (!up.ok || !uj.success) throw new Error(uj.debug_info?.message || uj.error?.message || `upload do Reel HTTP ${up.status}`);
      await graph(`/${c.page_id}/video_reels`, { upload_phase: "finish", video_id: String(start.video_id), video_state: "PUBLISHED", description: message, access_token: token }, "POST");
      postId = String(start.video_id);
    }
    await sql`update public.mm_ig_posts set fb_post_id = ${postId}, fb_error = null where media_id = ${mediaId}`;
    return postId;
  } catch (e) {
    const m = (e as Error).message;
    await sql`update public.mm_ig_posts set fb_error = ${m} where media_id = ${mediaId}`;
    await logRun("ig-facebook", false, `Facebook falhou (${kind === "IMAGE" ? "foto" : "Reel"}): ${m}`, { media_id: mediaId });
    return null;
  }
}

// ---------- Reels ----------
async function publishContainer(c: any, token: string, containerId: string) {
  const pub = await graph(`/${c.ig_user_id}/media_publish`, { creation_id: containerId, access_token: token }, "POST");
  const info = await graph(`/${pub.id}`, { fields: "permalink", access_token: token }).catch(() => ({}));
  return { mediaId: String(pub.id), permalink: (info as any).permalink ?? null };
}
async function finishReel(c: any, token: string, v: any) {
  const st = await graph(`/${v.container_id}`, { fields: "status_code,status", access_token: token });
  if (st.status_code === "ERROR" || st.status_code === "EXPIRED") {
    const m = `a Meta recusou o vídeo: ${st.status || st.status_code}`;
    await sql`update public.mm_ig_videos set status = 'erro', error = ${m}, updated_at = now() where id = ${v.id}`;
    throw new Error(m);
  }
  if (st.status_code !== "FINISHED") return null; // ainda processando
  const o = await product(v.item_id);
  const cap = caption(o, v.caption_extra);
  const link = await linkFor(o, "reel");
  const { mediaId, permalink } = await publishContainer(c, token, v.container_id);
  await sql`update public.mm_ig_videos set status = 'publicado', media_id = ${mediaId}, error = null, updated_at = now() where id = ${v.id}`;
  await sql`insert into public.mm_ig_posts (media_id, item_id, keyword, name, image, price, link, caption, permalink, media_type, video_id)
    values (${mediaId}, ${o.item_id}, ${o.keyword}, ${o.name}, ${v.cover_url ?? o.image}, ${o.price}, ${link}, ${cap}, ${permalink}, 'REELS', ${v.id})`;
  await setError(null);
  const fb = await publishFacebook(c, token, mediaId, "REELS", o, link, v.video_url, v.caption_extra);
  await logRun("ig-reel", true, `Reel publicado (${v.source === "manual" ? "vídeo enviado" : "gerado das fotos"})${fb ? " + Facebook" : ""}: ${clean(o.name)}`, { media_id: mediaId, video_id: v.id, fb_post_id: fb });
  return { posted: mediaId, type: "REELS", source: v.source, name: o.name, permalink, facebook: fb };
}
// termina Reels que ficaram processando na Meta numa rodada anterior
async function finishPending(c: any, token: string) {
  const pend = await sql`select * from public.mm_ig_videos where status = 'processando' order by updated_at limit 3`;
  const out: unknown[] = [];
  for (const v of pend) {
    if (Date.now() - new Date(v.updated_at).getTime() > 6 * 3600 * 1000) {
      await sql`update public.mm_ig_videos set status = 'erro', error = 'a Meta não terminou de processar em 6h', updated_at = now() where id = ${v.id}`;
      continue;
    }
    try { const r = await finishReel(c, token, v); if (r) out.push(r); } catch (e) { out.push({ video_id: v.id, error: (e as Error).message }); }
  }
  return out;
}
async function postReel(c: any, token: string, v: any) {
  const o = await product(v.item_id);
  if (!o) {
    await sql`update public.mm_ig_videos set status = 'erro', error = 'produto não encontrado na fila do Grupo VIP', updated_at = now() where id = ${v.id}`;
    return null;
  }
  const params: Record<string, string> = { media_type: "REELS", video_url: v.video_url, caption: caption(o, v.caption_extra), share_to_feed: "true", access_token: token };
  if (v.cover_url) params.cover_url = v.cover_url;
  let created: any;
  try { created = await graph(`/${c.ig_user_id}/media`, params, "POST"); }
  catch (e) {
    await sql`update public.mm_ig_videos set status = 'erro', error = ${(e as Error).message}, updated_at = now() where id = ${v.id}`;
    throw e;
  }
  await sql`update public.mm_ig_videos set status = 'processando', container_id = ${String(created.id)}, updated_at = now() where id = ${v.id}`;
  v.container_id = String(created.id);
  // vídeo demora mais que foto: espera até ~100 s; se não terminar, a próxima rodada publica
  for (let i = 0; i < 10; i++) {
    await sleep(10000);
    const r = await finishReel(c, token, v);
    if (r) return r;
  }
  return { pending: v.id, type: "REELS", note: "a Meta ainda está processando; publica na próxima rodada" };
}

// ---------- foto ----------
async function postPhoto(c: any, token: string) {
  // melhor oferta do dia que não foi postada nos últimos 10 dias e não está reservada para um Reel
  const [o] = await sql`
    select q.item_id, q.keyword, q.name, q.image, q.price::float8 price, q.sales, q.rating::float8 rating, q.product_link, q.affiliate_link
      from public.mm_vip_queue q
     where q.niche = 'casa' and q.status <> 'cancelado' and q.image is not null
       and (q.slot_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
       and not exists (select 1 from public.mm_ig_posts p where p.item_id = q.item_id and p.posted_at > now() - interval '10 days')
       and not exists (select 1 from public.mm_ig_videos v where v.item_id = q.item_id and v.status in ('editar','editando','pronto','processando'))
     order by q.commission desc, q.sales desc limit 1`;
  if (!o) return { skipped: "nenhuma oferta nova na fila de hoje" };
  const link = await linkFor(o, "post");
  const cap = caption(o);
  const created = await graph(`/${c.ig_user_id}/media`, { image_url: o.image, caption: cap, access_token: token }, "POST");
  for (let i = 0; i < 10; i++) {
    const st = await graph(`/${created.id}`, { fields: "status_code", access_token: token });
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("a Meta recusou a foto do produto");
    await sleep(3000);
  }
  const { mediaId, permalink } = await publishContainer(c, token, created.id);
  await sql`insert into public.mm_ig_posts (media_id, item_id, keyword, name, image, price, link, caption, permalink, media_type)
    values (${mediaId}, ${o.item_id}, ${o.keyword}, ${o.name}, ${o.image}, ${o.price}, ${link}, ${cap}, ${permalink}, 'IMAGE')`;
  await setError(null);
  const fb = await publishFacebook(c, token, mediaId, "IMAGE", o, link, o.image);
  await logRun("ig-post", true, `foto publicada${fb ? " + Facebook" : ""}: ${clean(o.name)}`, { media_id: mediaId, fb_post_id: fb });
  return { posted: mediaId, type: "IMAGE", name: o.name, permalink, facebook: fb };
}

// ---------- rodada híbrida ----------
async function post(opts: { force: boolean; inSlot: boolean; slot: string; type?: string }) {
  const c = await config();
  if (!c.ig_user_id) return { skipped: "Instagram ainda não conectado" };
  const token = await secret("mm_meta_page_token");
  const finished = await finishPending(c, token);
  if (!opts.inSlot) return { skipped: "fora do horário", finished };
  if (!c.posting_enabled && !opts.force) return { skipped: "posts automáticos desligados no painel", finished };
  if (finished.some((f: any) => f.posted)) return { finished }; // o Reel atrasado já ocupou este horário
  const reelSlot = opts.type ? opts.type === "reel" : (c.reel_slots || []).includes(opts.slot);
  if (reelSlot) {
    // vídeo enviado no painel primeiro, depois o gerado das fotos; sem vídeo pronto → foto
    const [v] = await sql`select * from public.mm_ig_videos where status = 'pronto' order by (source = 'manual') desc, created_at limit 1`;
    if (v) {
      const r = await postReel(c, token, v);
      if (r) return { ...r, finished };
    }
  }
  return { ...(await postPhoto(c, token)), finished };
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
// resposta privada (direct) ao comentário, com o link de compra do post e o Grupo VIP.
// Vai como "button template" (botões clicáveis, que funcionam até em pedido de mensagem ainda não aceito);
// se a Meta recusar o modelo, cai para o texto puro com os links.
async function sendDirect(c: any, token: string, commentId: string, p?: { name?: string; link?: string } | null) {
  const [vip] = await sql`select group_link from public.mm_vip_settings where niche = 'casa'`;
  const recipient = JSON.stringify({ comment_id: commentId });
  const aviso = `Comprando pelo link você apoia nosso trabalho, sem pagar nada a mais 💛`;
  const convite = [
    `🎁 Quer ver achadinhos assim antes de todo mundo?`,
    `No nosso Grupo VIP do WhatsApp eu separo todo dia as melhores ofertas e cupons da Shopee, com preços que muitas vezes acabam em poucas horas.`,
    `É gratuito, sem spam, e você sai quando quiser. Vai ser um prazer ter você lá! ✨`,
  ];
  const buttons: { type: string; url: string; title: string }[] = [];
  if (p?.link) buttons.push({ type: "web_url", url: p.link, title: "🛒 Ver na Shopee" });
  if (vip?.group_link) buttons.push({ type: "web_url", url: vip.group_link, title: "🎁 Grupo VIP grátis" });
  if (buttons.length) {
    const head = [c.reply_text];
    if (p?.name) head.push(``, `🛒 ${clean(p.name)}`, `É só tocar em "Ver na Shopee" aqui embaixo 👇`);
    if (vip?.group_link) head.push(``, ...convite);
    head.push(``, aviso);
    const text = head.join("\n").slice(0, 640);
    try {
      await graph(`/${c.page_id}/messages`, {
        recipient,
        message: JSON.stringify({ attachment: { type: "template", payload: { template_type: "button", text, buttons } } }),
        access_token: token,
      }, "POST");
      await sql`update public.mm_ig_replies set replied_private = true, error = null where comment_id = ${commentId}`;
      return;
    } catch (e) {
      console.error("button template recusado, enviando texto:", (e as Error).message);
    }
  }
  const lines = [c.reply_text];
  if (p?.name && p?.link) lines.push(``, `🛒 ${clean(p.name)}`, `👉 ${p.link}`);
  if (vip?.group_link) lines.push(``, ...convite, `👉 ${vip.group_link}`);
  lines.push(``, aviso);
  await graph(`/${c.page_id}/messages`, { recipient, message: JSON.stringify({ text: lines.join("\n") }), access_token: token }, "POST");
  await sql`update public.mm_ig_replies set replied_private = true, error = null where comment_id = ${commentId}`;
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
  const errs: string[] = [];
  try { await sendDirect(c, token, commentId, p); } catch (e) { errs.push(`direct: ${(e as Error).message}`); }
  try {
    await graph(`/${commentId}/replies`, { message: PUBLIC_REPLIES[Math.floor(Math.random() * PUBLIC_REPLIES.length)], access_token: token }, "POST");
    await sql`update public.mm_ig_replies set replied_public = true where comment_id = ${commentId}`;
  } catch (e) { errs.push(`comentário: ${(e as Error).message}`); }
  if (errs.length) await sql`update public.mm_ig_replies set error = ${errs.join(" | ")} where comment_id = ${commentId}`;
}

// Busca ativa de comentários (a cada 2 min pelo pg_cron). Funciona mesmo sem o webhook da Meta, que só entrega
// comentários de quem não tem papel no app depois da Revisão do App. onComment é idempotente (comment_id único).
async function pollComments() {
  const c = await config();
  if (!c.ig_user_id) return { skipped: "Instagram ainda não conectado" };
  const token = await secret("mm_meta_page_token");
  const posts = await sql`select media_id from public.mm_ig_posts where posted_at > now() - interval '7 days' order by posted_at desc limit 30`;
  let seen = 0;
  const errors: string[] = [];
  for (const p of posts) {
    try {
      const j = await graph(`/${p.media_id}/comments`, { fields: "id,text,username,from", limit: "50", access_token: token });
      for (const cm of (j.data || []) as any[]) {
        seen++;
        await onComment({ id: cm.id, text: cm.text, from: { username: cm.username ?? cm.from?.username }, media: { id: p.media_id } });
      }
    } catch (e) { errors.push(`${p.media_id}: ${(e as Error).message}`); }
  }
  // directs que falharam (ex.: acesso às mensagens desligado no Instagram): tenta de novo por até 7 dias,
  // que é a janela em que a Meta aceita resposta privada a um comentário
  const pending = await sql`select r.comment_id, r.error, p.name, p.link from public.mm_ig_replies r left join public.mm_ig_posts p on p.media_id = r.media_id
    where not r.replied_private and r.created_at > now() - interval '7 days' order by r.created_at limit 10`;
  let retried = 0;
  for (const r of pending) {
    try { await sendDirect(c, token, r.comment_id, r); retried++; }
    catch (e) { await sql`update public.mm_ig_replies set error = ${`direct: ${(e as Error).message}`} where comment_id = ${r.comment_id}`; }
  }
  return { posts: posts.length, comments: seen, directRetried: retried, directPending: pending.length - retried, errors };
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
        if (b.action === "poll") return json({ ok: true, ...(await pollComments()) });
        if (b.action === "post") {
          const c = await config();
          // o cron roda de hora em hora; só posta nos horários configurados (b.force publica agora; b.type força "reel" ou "foto")
          const slot = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(11, 13) + ":00";
          const inSlot = Boolean(b.force) || (c.post_slots || []).includes(slot);
          return json({ ok: true, slot, ...(await post({ force: Boolean(b.force), inSlot, slot, type: b.type })) });
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

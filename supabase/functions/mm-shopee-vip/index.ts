// MM · Shopee Afiliado — Grupo VIP (Casa & Cozinha e outros nichos).
//   action "build": escolhe as melhores ofertas do dia do nicho, gera o link de afiliado com Sub ID
//                   (zapvip/<nicho>/<item>) e agenda uma mensagem por horário em mm_vip_queue.
//   action "send":  envia as mensagens cujo horário chegou. Usa a Z-API se as chaves estiverem no cofre
//                   (mm_zapi_instance, mm_zapi_token, mm_zapi_client_token) e o grupo estiver configurado;
//                   sem isso, a mensagem fica "pendente" para postar pelo painel (/shopee/vip).
// Disparado pelo pg_cron com o header x-mm-cron (segredo do cofre).
import postgres from "npm:postgres@3.4.3";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const APP = "https://mm-intelligence-app.vercel.app";
const H = { "Content-Type": "application/json" };
const BANNED = /clareamento|clareia|clareador|melasma|100%|cura|emagrec/i;
const BR_OFFSET = "-03:00"; // Brasília (sem horário de verão)

type Settings = {
  niche: string; title: string; group_link: string | null; whatsapp_group_id: string | null; slots: string[];
  min_score: number; min_rate: number; min_sales: number; max_per_keyword: number; repeat_days: number; active: boolean;
};
type Offer = {
  item_id: number; keyword: string; name: string; image: string | null; price: number; sales: number; rating: number;
  commission: number; commission_rate: number; score: number; product_link: string | null; affiliate_link: string | null;
};

async function secret(name: string): Promise<string> {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name}`;
  return r[0]?.decrypted_secret || "";
}
async function logRun(kind: string, ok: boolean, message: string, counts: Record<string, unknown> = {}) {
  await sql`insert into public.mm_shopee_runs (kind, ok, message, counts) values (${kind}, ${ok}, ${message}, ${sql.json(counts)})`;
}

// ---------- texto da mensagem ----------
const HOOKS: Record<string, string[]> = {
  "organizador embaixo da pia": ["Embaixo da pia virou bagunça? Olha isso", "Dobrei o espaço embaixo da pia com isso"],
  "porta temperos giratorio": ["Acabou a caça ao tempero", "Todos os temperos à mão num giro só"],
  "suporte tampas panela": ["Tampa de panela caindo do armário? Resolvido", "Chega de tampa espalhada na gaveta"],
  "divisoria gaveta": ["Gaveta de talher que dá gosto de abrir", "Cada coisa no seu lugar na gaveta"],
  "escorredor louca dobravel": ["Escorredor que some quando você não usa", "Pia pequena? Esse escorredor dobra"],
  "pote hermetico": ["Despensa com cara de revista", "Comida fresca por mais tempo e armário organizado"],
  "prateleira organizadora armario": ["Dobrei o espaço do armário", "Armário lotado? Ganhe um andar a mais"],
  "utensilios silicone cozinha": ["Kit que não risca sua panela", "Troquei todos os utensílios por esses"],
  "organizador geladeira": ["Geladeira organizada em 10 minutos", "Abri a geladeira e deu paz"],
  "organizador cozinha": ["Cozinha organizada sem reforma", "Achadinho que organizou minha cozinha"],
  "dispenser detergente": ["Pia limpa e sem bucha jogada", "O achadinho que deixou a pia mais bonita"],
  "mop giratorio": ["Limpar o chão ficou rápido", "O mop que torce sozinho"],
  "mini processador eletrico": ["Picar alho e cebola em 5 segundos", "Chega de chorar picando cebola"],
  "luminaria sensor": ["Acende sozinha quando você passa", "Nunca mais tropeçar no escuro"],
  "aspirador portatil": ["Migalha no sofá? Resolve em segundos", "Aspirador que cabe na gaveta"],
  "umidificador": ["Ar seco no quarto? Olha esse", "Respira melhor no ar seco"],
  // Natal
  "pisca pisca natal": ["A casa já tá piscando pro Natal?", "Pisca-pisca campeão de vendas chegou"],
  "luz natal": ["Luzinha que deixa a casa com clima de Natal", "Natal mais iluminado gastando pouco"],
  "arvore de natal": ["Árvore de Natal montada sem gastar muito", "Deixa a árvore de Natal mais linda"],
  "bola de natal": ["Árvore de Natal com cara de loja", "Enfeite que transforma a árvore"],
  "enfeite natal": ["Enfeite de Natal que todo mundo tá comprando", "Casa no clima de Natal com pouco"],
  "decoracao natal": ["Decoração de Natal que dá vontade de copiar", "Natal decorado sem pesar no bolso"],
  "guirlanda natal": ["A porta de casa pronta pro Natal", "Guirlanda que recebe a visita com estilo"],
  "papai noel decoracao": ["O Papai Noel já chegou aqui em casa", "Decoração de Natal que as crianças amam"],
  "toalha mesa natal": ["Mesa da ceia pronta pra foto", "Ceia de Natal com mesa de revista"],
};
// Até a véspera de Natal os itens natalinos ganham prioridade na fila; depois voltam ao normal.
const XMAS_KW = /natal|noel|natalin/i;
function xmasSeason(dateBR: string) { const md = dateBR.slice(5); return md >= "11-01" && md <= "12-24"; }
const XMAS_BOOST = 20;
const XMAS_GENERIC = ["Achado de Natal que tá vendendo muito", "Casa no clima de Natal gastando pouco", "Decoração de Natal que todo mundo tá levando", "Pro Natal ficar mais bonito aí em casa"];
const GENERIC = ["Achadinho pra casa que vale cada centavo", "Esse aqui resolveu minha vida em casa", "Achado do dia pra sua casa", "Utilidade que todo lar precisa"];

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function shortName(n: string) {
  let s = n.replace(/^\s*(kit\s+)?\d+(\s*\/\s*\d+)+\s*(unidades|pcs|pçs)?\s*/i, "").replace(/\s+/g, " ").trim();
  if (s.length > 70) s = s.slice(0, 70).replace(/\s+\S*$/, "") + "…";
  return s;
}
export function buildMessage(o: { item_id: number; keyword: string; name: string; price: number; sales: number; rating: number }, link: string) {
  const pool = HOOKS[o.keyword] ?? (XMAS_KW.test(o.keyword) ? XMAS_GENERIC : GENERIC);
  const hook = pool[Number(o.item_id) % pool.length];
  const lines = [
    `${XMAS_KW.test(o.keyword) ? "🎄" : "🏠"} *${hook}*`,
    ``,
    shortName(o.name),
    `💰 *${brl(o.price)}*`,
    `${o.rating >= 4 ? `⭐ ${Number(o.rating).toFixed(1).replace(".", ",")} · ` : ""}${Number(o.sales).toLocaleString("pt-BR")} vendidos`,
    ``,
    `👉 ${link}`,
    ``,
    `_Link de afiliado: posso ganhar comissão, sem custo a mais pra você. Preço e estoque podem mudar._`,
  ];
  return lines.join("\n");
}

// ---------- build ----------
async function shortLink(productLink: string, subIds: string[]) {
  const r = await fetch(`${APP}/api/shopee/shortlink`, { method: "POST", headers: H, body: JSON.stringify({ url: productLink, subIds }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.shortLink) throw new Error(j.error || `shortlink HTTP ${r.status}`);
  return j.shortLink as string;
}

function todayBR() {
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

async function build(st: Settings) {
  const [{ day } = { day: null }] = await sql`
    select max(o.run_date) as day from public.mm_shopee_offers o
    join public.mm_shopee_keywords k on k.keyword = o.keyword and k.niche = ${st.niche}`;
  if (!day) return { queued: 0, msg: "sem ofertas do nicho ainda (aguarde o garimpo das 08h20)" };

  const offers = await sql<Offer[]>`
    select o.item_id, o.keyword, o.name, o.image, o.price::float8 price, o.sales, o.rating::float8 rating,
           o.commission::float8 commission, o.commission_rate::float8 commission_rate, o.score::float8 score,
           o.product_link, o.affiliate_link
      from public.mm_shopee_offers o
      join public.mm_shopee_keywords k on k.keyword = o.keyword and k.niche = ${st.niche}
     where o.run_date = ${day}
       and o.score >= ${st.min_score} and o.commission_rate >= ${st.min_rate} and o.sales >= ${st.min_sales}
       and o.commission_rate <= 40 -- comissão fora do comum fica para conferência manual
       and coalesce(o.product_link, o.affiliate_link) is not null
       and not exists (select 1 from public.mm_vip_queue q where q.niche = ${st.niche} and q.item_id = o.item_id
                        and q.status <> 'cancelado' and q.created_at > now() - make_interval(days => ${st.repeat_days}))
     order by o.score desc`;

  const date = todayBR();
  const taken = new Set((await sql`select slot_at from public.mm_vip_queue where niche = ${st.niche}
                                      and slot_at >= ${date + "T00:00:00" + BR_OFFSET}::timestamptz
                                      and slot_at < (${date + "T00:00:00" + BR_OFFSET}::timestamptz + interval '1 day')`)
    .map((r: any) => new Date(r.slot_at).toISOString()));
  const free = st.slots.map((h) => new Date(`${date}T${h}:00${BR_OFFSET}`).toISOString()).filter((s) => !taken.has(s));

  if (xmasSeason(date)) {
    const rank = (o: Offer) => o.score + (XMAS_KW.test(o.keyword) ? XMAS_BOOST : 0);
    offers.sort((a, b) => rank(b) - rank(a));
  }

  const perKw = new Map<string, number>();
  const picked: Offer[] = [];
  for (const o of offers) {
    if (picked.length >= free.length) break;
    if (BANNED.test(o.name)) continue;
    const c = perKw.get(o.keyword) ?? 0;
    if (c >= st.max_per_keyword) continue;
    perKw.set(o.keyword, c + 1); picked.push(o);
  }

  let queued = 0; const errors: string[] = [];
  for (let i = 0; i < picked.length; i++) {
    const o = picked[i];
    try {
      let link = o.affiliate_link || "";
      if (o.product_link) {
        try { link = await shortLink(o.product_link, ["zapvip", st.niche, String(o.item_id)]); }
        catch (e) { if (!link) throw e; errors.push(`${o.item_id}: sem Sub ID (${(e as Error).message})`); }
      }
      const message = buildMessage(o, link);
      const r = await sql`insert into public.mm_vip_queue
        (niche, item_id, keyword, name, image, price, sales, rating, commission, commission_rate, score, product_link, affiliate_link, message, slot_at)
        values (${st.niche}, ${o.item_id}, ${o.keyword}, ${o.name}, ${o.image}, ${o.price}, ${o.sales}, ${o.rating}, ${o.commission},
                ${o.commission_rate}, ${o.score}, ${o.product_link}, ${link}, ${message}, ${free[i]})
        on conflict (niche, slot_at) do nothing returning id`;
      queued += r.length;
    } catch (e) { errors.push(`${o.item_id}: ${(e as Error).message}`); }
  }
  const msg = `${queued} ofertas agendadas (${offers.length} candidatas, ${free.length} horários livres)` + (errors.length ? `; avisos: ${errors.slice(0, 3).join(" | ")}` : "");
  return { queued, candidates: offers.length, errors, msg };
}

// ---------- send ----------
async function recheck(q: any) {
  // Confere preço/estoque buscando de novo a palavra-chave; se o item sumiu da busca, mantém o envio.
  try {
    const r = await fetch(`${APP}/api/shopee/products?q=${encodeURIComponent(q.keyword)}&sort=2`);
    if (!r.ok) return q;
    const j = await r.json();
    const it = (j.items || []).find((p: any) => Number(p.id) === Number(q.item_id));
    if (it && Math.abs(Number(it.price) - Number(q.price)) >= 0.01) {
      const message = buildMessage({ ...q, price: it.price, sales: it.sales, rating: it.rating }, q.affiliate_link);
      await sql`update public.mm_vip_queue set price = ${it.price}, sales = ${it.sales}, message = ${message} where id = ${q.id}`;
      return { ...q, price: it.price, message };
    }
  } catch { /* segue com o texto atual */ }
  return q;
}

async function zapi(groupId: string, q: any) {
  const [inst, tok, client] = await Promise.all([secret("mm_zapi_instance"), secret("mm_zapi_token"), secret("mm_zapi_client_token")]);
  if (!inst || !tok) return null; // Z-API ainda não configurada
  const base = `https://api.z-api.io/instances/${inst}/token/${tok}`;
  const body = q.image ? { phone: groupId, image: q.image, caption: q.message } : { phone: groupId, message: q.message };
  const r = await fetch(`${base}/${q.image ? "send-image" : "send-text"}`, {
    method: "POST", headers: { ...H, ...(client ? { "Client-Token": client } : {}) }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || j.message || `Z-API HTTP ${r.status}`);
  return true;
}

async function send(st: Settings) {
  const due = await sql`select * from public.mm_vip_queue where niche = ${st.niche} and status = 'pendente'
                          and slot_at <= now() and slot_at > now() - interval '3 hours' order by slot_at`;
  if (!due.length) return { sent: 0, msg: "nada para enviar agora" };
  if (!st.whatsapp_group_id) return { sent: 0, waiting: due.length, msg: `${due.length} pronta(s) para postar pelo painel (envio automático pela Z-API ainda não ligado)` };
  let sent = 0; const errors: string[] = [];
  for (const raw of due) {
    const q = await recheck(raw);
    try {
      const ok = await zapi(st.whatsapp_group_id, q);
      if (ok === null) return { sent, waiting: due.length - sent, msg: "Z-API ainda não configurada no cofre; mensagens aguardando no painel" };
      await sql`update public.mm_vip_queue set status = 'enviado', sent_via = 'zapi', sent_at = now(), error = null where id = ${q.id}`;
      sent++;
    } catch (e) {
      const m = (e as Error).message;
      errors.push(m);
      await sql`update public.mm_vip_queue set status = 'erro', error = ${m} where id = ${q.id}`;
    }
  }
  return { sent, errors, msg: `${sent} enviada(s)` + (errors.length ? `; erros: ${errors.slice(0, 3).join(" | ")}` : "") };
}

Deno.serve(async (req) => {
  try {
    const cron = await secret("mm_cron_secret");
    if (!cron || req.headers.get("x-mm-cron") !== cron) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: H });
    const b = await req.json().catch(() => ({}));
    const action = String(b.action || "build");
    const list = await sql<Settings[]>`select * from public.mm_vip_settings where active ${b.niche ? sql`and niche = ${String(b.niche)}` : sql``}`;
    const out: Record<string, unknown> = {};
    for (const st of list) {
      const r: any = action === "send" ? await send(st) : await build(st);
      out[st.niche] = r;
      if (action !== "send" || r.sent || r.errors?.length || r.waiting) await logRun(`vip-${action}`, !(r.errors?.length) || (r.queued ?? r.sent) > 0, `[${st.niche}] ${r.msg}`, r);
    }
    return new Response(JSON.stringify({ ok: true, action, ...out }), { headers: H });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message || e) }), { status: 500, headers: H });
  }
});

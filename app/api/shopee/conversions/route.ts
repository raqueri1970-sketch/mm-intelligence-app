import { NextRequest, NextResponse } from 'next/server'
import { shopeeGraphQL, ShopeeConfigError } from '@/lib/shopee-affiliate'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = 'https://tazyeczbbgspqbyluynf.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_olCaCIksSYJGOaAYInXHeA_2pm-gaoF'

// Campos conferidos por introspecção na conta real (07/11/2026).
// A Shopee recusa Int64 passado como variável ("wrong type"), então os valores vão escritos na consulta.
function buildQuery(start: number, end: number, scrollId?: string) {
  const scroll = scrollId ? `, scrollId: ${JSON.stringify(scrollId)}` : ''
  return `{
  conversionReport(purchaseTimeStart: ${Math.trunc(start)}, purchaseTimeEnd: ${Math.trunc(end)}, limit: 500${scroll}) {
    nodes {
      purchaseTime conversionId totalCommission utmContent
      orders { orderId orderStatus items { itemId itemName itemPrice qty itemTotalCommission } }
    }
    pageInfo { limit hasNextPage scrollId }
  }
}`
}

type Item = { itemId?: number; itemName?: string; itemPrice?: string; qty?: number; itemTotalCommission?: string }
type Node = { purchaseTime?: number; conversionId?: string | number; totalCommission?: string; utmContent?: string; orders?: { orderId?: string; orderStatus?: string; items?: Item[] }[] }
type Page = { conversionReport?: { nodes?: Node[]; pageInfo?: { hasNextPage?: boolean; scrollId?: string } } }

// Só o agendador do Supabase (que conhece o segredo do cofre) pode puxar o relatório.
async function authorized(secret: string | null) {
  if (!secret || secret.length < 16) return false
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mm_check_cron_secret`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_secret: secret }),
    cache: 'no-store',
  })
  return r.ok && (await r.json()) === true
}

export async function GET(req: NextRequest) {
  const cron = req.headers.get('x-mm-cron')
  if (!(await authorized(cron))) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }
  const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 7))
  const end = Math.floor(Date.now() / 1000)
  const start = end - days * 86400
  const rows: Record<string, unknown>[] = []
  try {
    let scrollId: string | undefined
    for (let page = 0; page < 20; page++) {
      const data = await shopeeGraphQL<Page>(buildQuery(start, end, scrollId), {}, { cronSecret: cron! })
      const rep = data.conversionReport
      for (const n of rep?.nodes ?? []) {
        const subs = String(n.utmContent || '').split('-').map(s => s.trim())
        for (const o of n.orders ?? []) {
          for (const it of o.items ?? []) {
            rows.push({
              conversion_id: String(n.conversionId ?? ''),
              item_id: Number(it.itemId) || 0,
              purchase_time: n.purchaseTime ? new Date(n.purchaseTime * 1000).toISOString() : null,
              item_name: it.itemName ?? null,
              order_status: o.orderStatus ?? null,
              qty: Number(it.qty) || 0,
              item_price: Number(it.itemPrice) || 0,
              commission: Number(it.itemTotalCommission) || 0,
              sub1: subs[0] || null, sub2: subs[1] || null, sub3: subs[2] || null, sub4: subs[3] || null, sub5: subs[4] || null,
              raw: { utmContent: n.utmContent, orderId: o.orderId, totalCommission: n.totalCommission },
            })
          }
        }
      }
      if (!rep?.pageInfo?.hasNextPage || !rep.pageInfo.scrollId) break
      scrollId = rep.pageInfo.scrollId
    }
    return NextResponse.json({ days, rows })
  } catch (e) {
    const status = e instanceof ShopeeConfigError ? 503 : 502
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha na API da Shopee.' }, { status })
  }
}

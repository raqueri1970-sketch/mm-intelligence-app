import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// API oficial de Afiliados Shopee Brasil.
// Configure na Vercel: SHOPEE_APP_ID e SHOPEE_SECRET (affiliate.shopee.com.br -> Open API)
const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'

const QUERY = `query ($keyword: String, $sortType: Int, $page: Int, $limit: Int) {
  productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) {
    nodes { itemId productName shopName price priceDiscountRate sales ratingStar
            commissionRate commission imageUrl productLink offerLink }
    pageInfo { page limit hasNextPage }
  }
}`

type Node = {
  itemId: number; productName: string; shopName?: string; price?: string; priceDiscountRate?: number
  sales?: number; ratingStar?: string; commissionRate?: string; commission?: string
  imageUrl?: string; productLink?: string; offerLink?: string
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export async function GET(req: NextRequest) {
  const appId = process.env.SHOPEE_APP_ID
  const secret = process.env.SHOPEE_SECRET
  if (!appId || !secret) {
    return NextResponse.json(
      { error: 'Configure SHOPEE_APP_ID e SHOPEE_SECRET nas variáveis de ambiente da Vercel (Settings → Environment Variables) e faça redeploy.' },
      { status: 503 },
    )
  }
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Informe a palavra-chave.' }, { status: 400 })
  // sortType: 1 relevância · 2 mais vendidos · 3 maior preço · 4 menor preço · 5 maior comissão
  const sortType = Math.min(5, Math.max(1, n(req.nextUrl.searchParams.get('sort')) || 2))

  const payload = JSON.stringify({ query: QUERY, variables: { keyword: q, sortType, page: 1, limit: 50 } })
  const ts = Math.floor(Date.now() / 1000).toString()
  const signature = createHash('sha256').update(appId + ts + payload + secret).digest('hex')

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signature}`,
      },
      body: payload,
      cache: 'no-store',
    })
    const json = await res.json()
    if (json.errors?.length) {
      return NextResponse.json({ error: `Shopee: ${json.errors[0]?.message || 'erro'}` }, { status: 502 })
    }
    const nodes: Node[] = json.data?.productOfferV2?.nodes ?? []
    const items = nodes.map(p => {
      const price = n(p.price)
      const rate = n(p.commissionRate)
      const commission = n(p.commission) || price * rate
      return {
        id: p.itemId, name: p.productName, shop: p.shopName ?? '', price, discount: n(p.priceDiscountRate),
        sales: n(p.sales), rating: n(p.ratingStar), commissionRate: rate * 100, commission,
        image: p.imageUrl ?? '', productLink: p.productLink ?? '', affiliateLink: p.offerLink ?? '',
      }
    })
    // Score 0-100: 50% demanda (vendas) + 35% R$ de comissão + 15% nota
    const maxS = Math.max(1, ...items.map(i => i.sales))
    const maxC = Math.max(0.01, ...items.map(i => i.commission))
    const ranked = items
      .map(i => ({
        ...i,
        score: Math.round(100 * (0.5 * Math.sqrt(i.sales / maxS) + 0.35 * (i.commission / maxC) + 0.15 * Math.max(0, i.rating - 4))),
      }))
      .sort((a, b) => b.score - a.score)
    return NextResponse.json({ items: ranked })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha na API da Shopee.' }, { status: 502 })
  }
}

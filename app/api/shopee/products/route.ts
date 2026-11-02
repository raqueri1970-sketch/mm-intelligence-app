import { NextRequest, NextResponse } from 'next/server'
import { shopeeGraphQL, ShopeeConfigError } from '@/lib/shopee-affiliate'

export const dynamic = 'force-dynamic'

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
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Informe a palavra-chave.' }, { status: 400 })
  // sortType: 1 relevância · 2 mais vendidos · 3 maior preço · 4 menor preço · 5 maior comissão
  const sortType = Math.min(5, Math.max(1, n(req.nextUrl.searchParams.get('sort')) || 2))

  try {
    const data = await shopeeGraphQL<{ productOfferV2?: { nodes?: Node[] } }>(QUERY, { keyword: q, sortType, page: 1, limit: 50 })
    const nodes: Node[] = data.productOfferV2?.nodes ?? []
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
    const status = e instanceof ShopeeConfigError ? 503 : 502
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha na API da Shopee.' }, { status })
  }
}

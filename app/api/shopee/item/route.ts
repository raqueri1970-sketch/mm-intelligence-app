import { NextRequest, NextResponse } from 'next/server'
import { shopeeGraphQL, ShopeeConfigError } from '@/lib/shopee-affiliate'

export const dynamic = 'force-dynamic'

// o ID vai direto na consulta (a API recusa o Int64 como variável: "wrong type"); já validado como só dígitos
const query = (id: string) => `query {
  productOfferV2(itemId: ${id}, page: 1, limit: 1) {
    nodes { itemId productName price sales ratingStar commissionRate commission imageUrl productLink offerLink }
  }
}`

type Node = {
  itemId: number; productName: string; price?: string; sales?: number; ratingStar?: string
  commissionRate?: string; commission?: string; imageUrl?: string; productLink?: string; offerLink?: string
}
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// GET ?id=ITEM_ID → dados do produto pela API de Afiliados (usado ao enviar vídeo com link escolhido)
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim() || ''
  if (!/^\d{3,20}$/.test(id)) return NextResponse.json({ error: 'ID do produto inválido.' }, { status: 400 })
  try {
    const data = await shopeeGraphQL<{ productOfferV2?: { nodes?: Node[] } }>(query(id), {})
    const p = data.productOfferV2?.nodes?.[0]
    if (!p) return NextResponse.json({ error: 'Produto não encontrado no programa de afiliados da Shopee.' }, { status: 404 })
    const price = n(p.price)
    return NextResponse.json({
      item_id: String(p.itemId), name: p.productName, price, sales: n(p.sales), rating: n(p.ratingStar),
      commission: n(p.commission) || price * n(p.commissionRate), commission_rate: n(p.commissionRate) * 100,
      image: p.imageUrl ?? '', product_link: p.productLink ?? '', affiliate_link: p.offerLink ?? '',
    })
  } catch (e) {
    const status = e instanceof ShopeeConfigError ? 503 : 502
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha na API da Shopee.' }, { status })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { shopeeGraphQL, ShopeeConfigError } from '@/lib/shopee-affiliate'

export const dynamic = 'force-dynamic'

const MUTATION = `mutation ($url: String!, $subIds: [String]) {
  generateShortLink(input: { originUrl: $url, subIds: $subIds }) { shortLink }
}`

// POST { url: "https://shopee.com.br/...", subIds: ["tiktok","produto","remix01"] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const url = String(body?.url || '').trim()
  const subIds: string[] = Array.isArray(body?.subIds)
    ? body.subIds.map((v: unknown) => String(v).replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean).slice(0, 5)
    : []
  if (!/^https:\/\/([a-z0-9-]+\.)*shopee\.com\.br\//i.test(url) && !/^https:\/\/s\.shopee\.com\.br\//i.test(url)) {
    return NextResponse.json({ error: 'Use um link da Shopee Brasil (shopee.com.br).' }, { status: 400 })
  }
  try {
    const data = await shopeeGraphQL<{ generateShortLink?: { shortLink?: string } }>(MUTATION, { url, subIds })
    const shortLink = data.generateShortLink?.shortLink
    if (!shortLink) return NextResponse.json({ error: 'A Shopee não devolveu o link.' }, { status: 502 })
    return NextResponse.json({ shortLink, subIds })
  } catch (e) {
    const status = e instanceof ShopeeConfigError ? 503 : 502
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha na API da Shopee.' }, { status })
  }
}

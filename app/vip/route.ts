import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Link da bio do Instagram: /vip?src=bio  (opcional: &n=casa para escolher o nicho)
// Registra o clique e manda a pessoa para o grupo do WhatsApp configurado em /shopee/vip.
const SAFE_LINK = /^https:\/\/(chat\.whatsapp\.com|whatsapp\.com\/channel|www\.whatsapp\.com\/channel)\//i
const clean = (v: string | null, max: number) => (v || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, max)

export async function GET(req: NextRequest) {
  const niche = clean(req.nextUrl.searchParams.get('n'), 40) || 'casa'
  const source = clean(req.nextUrl.searchParams.get('src'), 40) || 'direto'

  const { data } = await supabase.from('mm_vip_settings').select('title,group_link,active').eq('niche', niche).maybeSingle()
  await supabase.from('mm_vip_clicks').insert({ niche, source })

  const link = data?.active ? data.group_link : null
  if (link && SAFE_LINK.test(link)) return Response.redirect(link, 302)

  const title = (data?.title || 'Grupo VIP').replace(/[<>&"]/g, '')
  return new Response(
    `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0b1020;color:#e5e7eb;text-align:center;padding:24px}h1{font-size:22px}p{color:#9ca3af}</style></head>
<body><div><h1>${title}</h1><p>O grupo abre em breve. Volte daqui a pouquinho! 🏠</p></div></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )
}

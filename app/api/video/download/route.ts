import { NextRequest, NextResponse } from 'next/server'
import { checkUrl, fileNameFor, resolveVideo } from '@/lib/video-resolver'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/video/download?url=<link da página>          -> baixa o .mp4
// GET /api/video/download?url=<link da página>&info=1   -> só os dados (título, views...)
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Informe ?url=' }, { status: 400 })
  try {
    const v = await resolveVideo(url)
    checkUrl(v.videoUrl)
    if (req.nextUrl.searchParams.get('info')) {
      return NextResponse.json({ source: v.source, title: v.title, views: v.views, likes: v.likes, author: v.author, fileName: fileNameFor(v) })
    }
    const file = await fetch(v.videoUrl, { headers: v.headers, redirect: 'follow', cache: 'no-store' })
    const type = file.headers.get('content-type') || ''
    if (!file.ok || !file.body || !/video|octet-stream/i.test(type)) {
      return NextResponse.json({ error: `O servidor do vídeo recusou o download (${file.status}).` }, { status: 502 })
    }
    const headers = new Headers({
      'content-type': type.includes('video') ? type : 'video/mp4',
      'content-disposition': `attachment; filename="${fileNameFor(v)}"`,
      'cache-control': 'no-store',
      'x-video-title': encodeURIComponent(v.title.slice(0, 200)),
      'x-video-source': v.source,
    })
    const len = file.headers.get('content-length')
    if (len) headers.set('content-length', len)
    return new Response(file.body, { headers })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Falha ao baixar.' }, { status: 422 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SearchItem = {
  id?: { videoId?: string }
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } }
  }
}

type VideoItem = {
  id?: string
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string }
}

export async function GET(req: NextRequest) {
  const key = process.env.CHAVE_API_DO_YOUTUBE
  if (!key) return NextResponse.json({ error: 'CHAVE_API_DO_YOUTUBE não configurada no servidor' }, { status: 500 })

  const q = req.nextUrl.searchParams.get('q')?.trim() || 'beauty product pain relief'
  const regionCode = (req.nextUrl.searchParams.get('region') || 'US').toUpperCase()
  const maxResults = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit') || 12), 1), 25)

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.searchParams.set('part', 'snippet')
    searchUrl.searchParams.set('type', 'video')
    searchUrl.searchParams.set('order', 'viewCount')
    searchUrl.searchParams.set('q', q)
    searchUrl.searchParams.set('regionCode', regionCode)
    searchUrl.searchParams.set('relevanceLanguage', regionCode === 'MX' ? 'es' : 'en')
    searchUrl.searchParams.set('maxResults', String(maxResults))
    searchUrl.searchParams.set('key', key)

    const searchRes = await fetch(searchUrl, { cache: 'no-store' })
    const searchData = await searchRes.json()
    if (!searchRes.ok) return NextResponse.json({ error: 'YouTube search falhou', details: searchData?.error }, { status: searchRes.status })

    const items: SearchItem[] = searchData.items || []
    const ids = items.map(i => i.id?.videoId).filter(Boolean) as string[]
    let stats = new Map<string, VideoItem['statistics']>()

    if (ids.length) {
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
      videosUrl.searchParams.set('part', 'statistics')
      videosUrl.searchParams.set('id', ids.join(','))
      videosUrl.searchParams.set('key', key)
      const videosRes = await fetch(videosUrl, { cache: 'no-store' })
      const videosData = await videosRes.json()
      if (videosRes.ok) stats = new Map((videosData.items || []).map((v: VideoItem) => [v.id || '', v.statistics]))
    }

    const videos = items.map(item => {
      const id = item.id?.videoId || ''
      const s = stats.get(id)
      return {
        videoId: id,
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        channel: item.snippet?.channelTitle || '',
        publishedAt: item.snippet?.publishedAt || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        views: Number(s?.viewCount || 0),
        likes: Number(s?.likeCount || 0),
        comments: Number(s?.commentCount || 0),
        url: `https://www.youtube.com/watch?v=${id}`,
      }
    })

    return NextResponse.json({ source: 'YouTube Data API v3', query: q, regionCode, collectedAt: new Date().toISOString(), videos })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno ao consultar YouTube', details: String(error) }, { status: 500 })
  }
}

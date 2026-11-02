// Resolve um link de página (TikTok, Mercado Livre Clips, Instagram, link direto...)
// para o arquivo de vídeo real, com os headers necessários para baixá-lo.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

export type ResolvedVideo = {
  source: 'tiktok' | 'mercadolivre' | 'direto' | 'og:video'
  title: string
  videoUrl: string
  headers: Record<string, string>
  views?: number
  likes?: number
  author?: string
}

const BLOCKED_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|.*\.internal$|.*\.local$)/i

export function checkUrl(raw: string): URL {
  const u = new URL(raw.trim())
  if (!/^https?:$/.test(u.protocol)) throw new Error('Use um link http(s).')
  if (BLOCKED_HOST.test(u.hostname)) throw new Error('Endereço não permitido.')
  return u
}

const isDirectFile = (u: URL) => /\.(mp4|mov|webm|m4v)$/i.test(u.pathname)

function cookiesFrom(res: Response) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  return list.map(c => c.split(';')[0]).join('; ')
}

function decode(s: string) {
  return s.replace(/\\u002F/gi, '/').replace(/\\\//g, '/').replace(/&amp;/g, '&')
}

function slug(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
      .toLowerCase() || 'video'
  )
}
export const fileNameFor = (v: ResolvedVideo) => `${v.source}-${slug(v.title)}.mp4`

async function getPage(u: URL) {
  const res = await fetch(u, {
    headers: { 'user-agent': UA, 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' },
    redirect: 'follow',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`A página respondeu ${res.status}.`)
  return { res, html: await res.text(), finalUrl: new URL(res.url || u.toString()) }
}

async function resolveTikTok(u: URL): Promise<ResolvedVideo> {
  const { res, html } = await getPage(u)
  const cookie = cookiesFrom(res)
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
  if (m) {
    try {
      const data = JSON.parse(m[1])
      const item = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
      // downloadAddr = arquivo oficial de download do TikTok (mantém a marca d'água / crédito do criador)
      const videoUrl = item?.video?.downloadAddr || item?.video?.playAddr
      if (videoUrl) {
        return {
          source: 'tiktok',
          title: item.desc || `tiktok-${item.id}`,
          videoUrl,
          headers: { 'user-agent': UA, referer: 'https://www.tiktok.com/', ...(cookie ? { cookie } : {}) },
          views: Number(item.stats?.playCount) || undefined,
          likes: Number(item.stats?.diggCount) || undefined,
          author: item.author?.uniqueId,
        }
      }
    } catch {
      /* cai no plano B */
    }
  }
  // Plano B (TikTok costuma bloquear IP de servidor): serviço público tikwm, versão com marca d'água.
  const api = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(u.toString())}`, {
    headers: { 'user-agent': UA },
    cache: 'no-store',
  })
  const j = await api.json().catch(() => null)
  const d = j?.data
  const videoUrl = d?.wmplay || d?.play
  if (!videoUrl) throw new Error('O TikTok não liberou esse vídeo (privado, removido ou bloqueado). Tente de novo em instantes.')
  return {
    source: 'tiktok',
    title: d.title || `tiktok-${d.id}`,
    videoUrl: videoUrl.startsWith('http') ? videoUrl : `https://www.tikwm.com${videoUrl}`,
    headers: { 'user-agent': UA },
    views: Number(d.play_count) || undefined,
    likes: Number(d.digg_count) || undefined,
    author: d.author?.unique_id,
  }
}

function metaContent(html: string, prop: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
  return (html.match(re) || html.match(re2))?.[1]
}

async function resolveByMeta(u: URL, source: ResolvedVideo['source']): Promise<ResolvedVideo> {
  const { res, html, finalUrl } = await getPage(u)
  let videoUrl =
    metaContent(html, 'og:video:secure_url') || metaContent(html, 'og:video:url') || metaContent(html, 'og:video')
  if (!videoUrl) videoUrl = html.match(/https?:[^"'\s<>]+?\.mp4[^"'\s<>]*/i)?.[0]
  if (!videoUrl) throw new Error('Não encontrei um arquivo de vídeo nessa página.')
  videoUrl = decode(videoUrl)
  const cookie = cookiesFrom(res)
  return {
    source,
    title: decode(metaContent(html, 'og:title') || finalUrl.pathname.split('/').filter(Boolean).pop() || 'video'),
    videoUrl,
    headers: { 'user-agent': UA, referer: finalUrl.origin + '/', ...(cookie ? { cookie } : {}) },
  }
}

export async function resolveVideo(raw: string): Promise<ResolvedVideo> {
  const u = checkUrl(raw)
  const host = u.hostname.replace(/^www\./, '')
  if (isDirectFile(u)) {
    return { source: 'direto', title: u.pathname.split('/').pop() || 'video', videoUrl: u.toString(), headers: { 'user-agent': UA } }
  }
  if (/(^|\.)tiktok\.com$/.test(host)) return resolveTikTok(u)
  if (/youtube\.com$|youtu\.be$/.test(host))
    throw new Error('YouTube não permite download por aqui. Use o YouTube Studio (vídeos seus) ou peça o arquivo ao criador.')
  if (/mercadoli(v|b)re\.|mlstatic\.com$/.test(host)) return resolveByMeta(u, 'mercadolivre')
  return resolveByMeta(u, 'og:video')
}

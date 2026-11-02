// Remixador de criativos 100% no navegador (canvas + MediaRecorder).
// Cada vídeo novo = [gancho 0-3s com texto] + [trechos de OUTROS vídeos] + [CTA final].

export type RemixOptions = {
  hooks: string[]
  count: number
  targetSeconds: number
  cta: string
  onProgress?: (msg: string) => void
}
export type RemixResult = { name: string; url: string; blob: Blob; recipe: string }

const W = 1080, H = 1920
const HOOK = 3, PIECE = 2.5, CTA = 3

type Seg = { file: File; start: number; dur: number; text?: string; bottom?: boolean }

function pickMime() {
  const opts = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm']
  return opts.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || 'video/webm'
}

function probeDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { resolve(v.duration); URL.revokeObjectURL(v.src) }
    v.onerror = () => reject(new Error(`Não consegui ler ${file.name}`))
    v.src = URL.createObjectURL(file)
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/), lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  return lines
}

function drawCover(ctx: CanvasRenderingContext2D, v: HTMLVideoElement) {
  const s = Math.max(W / v.videoWidth, H / v.videoHeight)
  const w = v.videoWidth * s, h = v.videoHeight * s
  ctx.drawImage(v, (W - w) / 2, (H - h) / 2, w, h)
}

function drawText(ctx: CanvasRenderingContext2D, text: string, bottom = false) {
  ctx.font = '800 84px Manrope, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineJoin = 'round'
  const lines = wrap(ctx, text, W * 0.84)
  const lh = 100
  let y = bottom ? H * 0.78 - lines.length * lh : H * 0.11
  for (const l of lines) {
    ctx.lineWidth = 14
    ctx.strokeStyle = '#000'
    ctx.strokeText(l, W / 2, y)
    ctx.fillStyle = '#fff'
    ctx.fillText(l, W / 2, y)
    y += lh
  }
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>(resolve => {
    const done = () => { v.removeEventListener('seeked', done); resolve() }
    v.addEventListener('seeked', done)
    v.currentTime = t
  })
}

function loadSrc(v: HTMLVideoElement, url: string) {
  return new Promise<void>((resolve, reject) => {
    v.onloadeddata = () => resolve()
    v.onerror = () => reject(new Error('Falha ao carregar vídeo'))
    v.src = url
    v.load()
  })
}

function shuffle<T>(a: T[]) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

export async function remix(files: File[], o: RemixOptions): Promise<RemixResult[]> {
  if (files.length < 2) throw new Error('Adicione pelo menos 2 vídeos no banco.')
  o.onProgress?.('Lendo vídeos...')
  const durs = await Promise.all(files.map(probeDuration))
  const urls = new Map(files.map(f => [f, URL.createObjectURL(f)]))

  // banco de trechos do "meio" de cada vídeo
  const pieces: { file: File; start: number }[] = []
  files.forEach((f, i) => {
    for (let t = HOOK; t + PIECE <= durs[i] - CTA * 0.5; t += PIECE) pieces.push({ file: f, start: t })
    if (durs[i] < HOOK + PIECE) pieces.push({ file: f, start: 0 })
  })
  const nBody = Math.max(1, Math.round((o.targetSeconds - HOOK - CTA) / PIECE))

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!
  const video = document.createElement('video')
  video.playsInline = true
  video.crossOrigin = 'anonymous'
  const audio = new AudioContext()
  const dest = audio.createMediaStreamDestination()
  audio.createMediaElementSource(video).connect(dest) // som vai só para a gravação, não para a caixa de som
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()])
  const mime = pickMime()
  const ext = mime.includes('mp4') ? 'mp4' : 'webm'
  const out: RemixResult[] = []

  try {
    for (let k = 0; k < o.count; k++) {
      const hookIdx = k % files.length
      const hookFile = files[hookIdx]
      const ctaFile = files[(k + Math.ceil(files.length / 2)) % files.length]
      const hookText = o.hooks.length ? o.hooks[k % o.hooks.length] : ''
      const pool = pieces.filter(p => p.file !== hookFile)
      const body = shuffle(pool.length ? pool : pieces).slice(0, nBody)
      const ctaDur = Math.min(CTA, durs[files.indexOf(ctaFile)])
      const segs: Seg[] = [
        { file: hookFile, start: 0, dur: Math.min(HOOK, durs[hookIdx]), text: hookText },
        ...body.map(b => ({ file: b.file, start: b.start, dur: PIECE })),
        { file: ctaFile, start: Math.max(0, durs[files.indexOf(ctaFile)] - ctaDur), dur: ctaDur, text: o.cta, bottom: true },
      ]

      const chunks: Blob[] = []
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
      rec.ondataavailable = e => e.data.size && chunks.push(e.data)
      const stopped = new Promise<void>(r => (rec.onstop = () => r()))
      await audio.resume()

      for (let s = 0; s < segs.length; s++) {
        const seg = segs[s]
        o.onProgress?.(`Vídeo ${k + 1}/${o.count} — cena ${s + 1}/${segs.length}`)
        const src = urls.get(seg.file)!
        if (video.src !== src) await loadSrc(video, src)
        await seek(video, seg.start)
        drawCover(ctx, video)
        if (seg.text) drawText(ctx, seg.text, seg.bottom)
        if (rec.state === 'inactive') rec.start(250)
        else rec.resume()
        await video.play()
        await new Promise<void>(resolve => {
          const end = seg.start + seg.dur
          const tick = () => {
            drawCover(ctx, video)
            if (seg.text) drawText(ctx, seg.text, seg.bottom)
            if (video.currentTime >= end || video.ended) return resolve()
            requestAnimationFrame(tick)
          }
          tick()
        })
        video.pause()
        rec.pause()
      }
      rec.stop()
      await stopped
      const blob = new Blob(chunks, { type: mime.split(';')[0] })
      const name = `remix_${String(k + 1).padStart(2, '0')}.${ext}`
      out.push({
        name, blob, url: URL.createObjectURL(blob),
        recipe: `gancho "${hookText}" (${hookFile.name}) • corpo: ${body.map(b => `${b.file.name}@${b.start.toFixed(1)}s`).join(', ')} • CTA: ${ctaFile.name}`,
      })
    }
  } finally {
    stream.getTracks().forEach(t => t.stop())
    await audio.close()
    urls.forEach(u => URL.revokeObjectURL(u))
  }
  o.onProgress?.('Pronto!')
  return out
}

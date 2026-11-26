'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee.module.css'
import { LastRun } from '../DailyRanking'
import { ShopeeTabs, brl } from '../shared'

// Instagram automático (híbrido): fotos + Reels. Status da conexão com a Meta, horários de foto/Reel,
// envio manual de vídeo, fila de vídeos (enviados e gerados das fotos), posts publicados e respostas ao "EU QUERO".
type Config = {
  page_name: string | null; ig_username: string | null; connected_at: string | null; webhook_ok: boolean
  posting_enabled: boolean; post_slots: string[]; reel_slots: string[]; reply_text: string; last_error: string | null
}
type Post = { media_id: string; name: string; image: string | null; price: number; permalink: string | null; posted_at: string; media_type: string | null }
type Reply = { comment_id: string; username: string; text: string; replied_private: boolean; replied_public: boolean; error: string | null; created_at: string }
type Video = { id: number; item_id: number; source: 'manual' | 'auto'; name: string | null; status: string; video_url: string | null; cover_url: string | null; error: string | null; created_at: string }
type Prod = { item_id: string; name: string; image: string | null; price: number; keyword: string }

const SLOTS = ['08:00', '10:00', '12:00', '15:00', '18:00', '20:00', '22:00']
const VIDEO_API = 'https://tazyeczbbgspqbyluynf.supabase.co/functions/v1/mm-video-api'
const PUBLISHABLE_KEY = 'sb_publishable_olCaCIksSYJGOaAYInXHeA_2pm-gaoF'
const MAX_MB = 100
const STATUS: Record<string, [string, string]> = {
  editar: ['na fila do editor', s.wait], editando: ['editando…', s.wait], pronto: ['pronto para publicar', s.ok],
  processando: ['Meta processando', s.wait], publicado: ['publicado ✓', s.ok], erro: ['erro', s.err], cancelado: ['cancelado', s.hint],
}

async function videoApi(body: Record<string, unknown>) {
  const res = await fetch(VIDEO_API, { method: 'POST', headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

export default function InstagramPage() {
  const [c, setC] = useState<Config | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [prods, setProds] = useState<Prod[]>([])
  const [saving, setSaving] = useState(false)
  const [itemId, setItemId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [extra, setExtra] = useState('')
  const [sending, setSending] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const loadVideos = useCallback(() => {
    supabase.from('mm_ig_videos').select('id,item_id,source,name,status,video_url,cover_url,error,created_at')
      .neq('status', 'cancelado').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setVideos((data as Video[]) ?? []))
  }, [])

  useEffect(() => {
    supabase.from('mm_ig_config').select('page_name,ig_username,connected_at,webhook_ok,posting_enabled,post_slots,reel_slots,reply_text,last_error').eq('id', 1).maybeSingle()
      .then(({ data }) => setC(data as Config | null))
    supabase.from('mm_ig_posts').select('media_id,name,image,price,permalink,posted_at,media_type').order('posted_at', { ascending: false }).limit(20)
      .then(({ data }) => setPosts((data as Post[]) ?? []))
    supabase.from('mm_ig_replies').select('comment_id,username,text,replied_private,replied_public,error,created_at').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setReplies((data as Reply[]) ?? []))
    videoApi({ action: 'products' }).then((p) => setProds(p as Prod[])).catch(() => setProds([]))
    loadVideos()
  }, [loadVideos])

  async function save(patch: Partial<Pick<Config, 'posting_enabled' | 'post_slots' | 'reel_slots'>>) {
    if (!c) return
    setSaving(true)
    const { error } = await supabase.from('mm_ig_config').update(patch).eq('id', 1)
    if (!error) setC({ ...c, ...patch })
    setSaving(false)
  }
  // clique no horário: desligado → foto → Reel → desligado
  const cycleSlot = (h: string) => {
    if (!c) return
    const post = new Set(c.post_slots), reel = new Set(c.reel_slots ?? [])
    if (!post.has(h)) post.add(h)
    else if (!reel.has(h)) reel.add(h)
    else { post.delete(h); reel.delete(h) }
    save({ post_slots: SLOTS.filter(x => post.has(x)), reel_slots: SLOTS.filter(x => reel.has(x) && post.has(x)) })
  }

  async function sendVideo() {
    setMsg(null)
    if (!itemId) return setMsg({ ok: false, text: 'Escolha o produto do vídeo.' })
    if (!file) return setMsg({ ok: false, text: 'Escolha o arquivo de vídeo.' })
    if (!/\.(mp4|mov)$/i.test(file.name)) return setMsg({ ok: false, text: 'Use vídeo MP4 ou MOV.' })
    if (file.size > MAX_MB * 1024 * 1024) return setMsg({ ok: false, text: `O vídeo passa de ${MAX_MB} MB. Corte ou comprima antes de enviar.` })
    try {
      setSending('Preparando envio…')
      const up = await videoApi({ action: 'upload-url', filename: file.name })
      setSending(`Enviando ${(file.size / 1048576).toFixed(1)} MB…`)
      const { error } = await supabase.storage.from('mm-videos').uploadToSignedUrl(up.path, up.token, file, { contentType: file.type || 'video/mp4' })
      if (error) throw new Error(error.message)
      setSending('Colocando na fila do editor…')
      await videoApi({ action: 'submit', item_id: itemId, path: up.path, caption_extra: extra.trim() || undefined })
      setMsg({ ok: true, text: 'Vídeo enviado! O editor automático corta, coloca preço e "Comente EU QUERO" em até 15 minutos, e ele sai no próximo horário de Reel.' })
      setFile(null); setExtra(''); setItemId('')
      loadVideos()
    } catch (e) {
      setMsg({ ok: false, text: `Não deu para enviar: ${(e as Error).message}` })
    } finally { setSending('') }
  }
  async function cancelVideo(id: number) {
    try { await videoApi({ action: 'cancel', id }); loadVideos() } catch (e) { setMsg({ ok: false, text: (e as Error).message }) }
  }

  const connected = Boolean(c?.connected_at && c.ig_username)
  const today = new Date().toDateString()
  const repliedToday = replies.filter(r => new Date(r.created_at).toDateString() === today && r.replied_private).length
  const ready = videos.filter(v => v.status === 'pronto').length
  const reelSlots = (c?.reel_slots ?? []).filter(h => c?.post_slots.includes(h))
  const photoSlots = (c?.post_slots ?? []).filter(h => !reelSlots.includes(h))
  const selected = prods.find(p => p.item_id === itemId)

  return (
    <div className={s.page}>
      <div className={s.head}><h1>📸 Instagram automático</h1><p>Posta sozinho no @kliccasa: <b>fotos</b> e <b>Reels</b> das melhores ofertas do dia, e responde no direct quem comenta <b>EU QUERO</b>, com o link de afiliado (Sub ID <b>insta</b>).</p></div>
      <ShopeeTabs />

      <div className={s.stats}>
        <div className={s.stat} style={{ borderColor: connected ? 'rgba(16,185,129,.45)' : 'rgba(245,158,11,.45)' }}>
          <span>Conexão com a Meta</span><strong>{connected ? `@${c!.ig_username}` : 'Aguardando'}</strong>
          <small>{connected ? `página ${c!.page_name} · desde ${new Date(c!.connected_at!).toLocaleDateString('pt-BR')}` : 'falta salvar as chaves (passo a passo abaixo)'}</small>
        </div>
        <div className={s.stat}><span>Posts publicados</span><strong>{posts.length}</strong><small>{c?.posting_enabled ? `${posts.filter(p => p.media_type === 'REELS').length} Reels · ${posts.filter(p => p.media_type !== 'REELS').length} fotos` : 'posts automáticos desligados'}</small></div>
        <div className={s.stat}><span>Reels prontos</span><strong>{ready}</strong><small>na fila para os horários {reelSlots.join(' · ') || '— (nenhum horário de Reel)'}</small></div>
        <div className={s.stat}><span>Respostas EU QUERO</span><strong>{repliedToday}</strong><small>hoje · {c?.webhook_ok ? 'respostas ligadas' : 'respostas ainda não ligadas'}</small></div>
      </div>

      {c?.last_error && connected && <p className={`${s.hint} ${s.err}`}>Último aviso da Meta: {c.last_error}</p>}

      {!connected && (
        <section className={s.panel} style={{ borderColor: 'rgba(245,158,11,.4)' }}>
          <div className={s.panelHead}><div><h2>Como ligar (uma vez só)</h2><p>Depois disso, tudo roda sozinho.</p></div></div>
          <ol className={s.howto}>
            <li><b>Instagram @kliccasa</b> como conta profissional e ligado à página do Facebook (☰ → Central de Contas → Contas → Adicionar contas).</li>
            <li>No Instagram: ☰ → Mensagens e respostas → <b>Ferramentas conectadas</b> → ligue <b>Permitir acesso às mensagens</b>.</li>
            <li>No app da Meta <b>Kliccasa MM</b>: Configurações do app → Básico → copie a <b>Chave secreta do app</b>. Em Política de Privacidade use <code>https://mm-intelligence-app.vercel.app/privacy</code> e publique o app (modo <b>Ao vivo</b>).</li>
            <li>No <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer">Explorador da Graph API</a>: app Kliccasa MM → <b>Gerar token</b> com as permissões da lista e escolha a página e o @kliccasa.</li>
            <li>Salve as duas chaves no cofre do Supabase (instruções no chat) e avise o Claude para conectar.</li>
          </ol>
        </section>
      )}

      {c && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Horários: foto ou Reel</h2><p>Toque no horário para alternar: <b>desligado → 📷 foto → 🎬 Reel</b>. No horário de Reel sai o vídeo pronto da fila (o enviado por você primeiro, depois o gerado das fotos); se não houver vídeo pronto, sai foto.</p></div>
            <button className={c.posting_enabled ? s.btn : `${s.btn} ${s.btnGhost}`} disabled={saving} onClick={() => save({ posting_enabled: !c.posting_enabled })}>{c.posting_enabled ? 'LIGADO ✓' : 'DESLIGADO'}</button>
          </div>
          <div className={s.chips}>{SLOTS.map(h => {
            const on = c.post_slots.includes(h), reel = on && (c.reel_slots ?? []).includes(h)
            return <button key={h} type="button" disabled={saving} className={`${s.chip} ${on ? s.chipOn : ''}`} onClick={() => cycleSlot(h)}>{reel ? '🎬' : on ? '📷' : '○'} {h}</button>
          })}</div>
          <p className={s.hint}>Foto: {photoSlots.join(' · ') || '—'} · Reel: {reelSlots.join(' · ') || '—'}. O Instagram aceita até 50 posts por dia, mas poucos posts bons rendem mais que muitos.</p>
          <LastRun kinds={['ig-post', 'ig-reel', 'ig-setup']} />
        </section>
      )}

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>🎬 Enviar vídeo para Reel</h2><p>Mande o vídeo do produto (por exemplo, o demonstrativo do lojista, quando ele autoriza o uso por afiliados). O editor automático deixa vertical, corta para até 45 s e coloca gancho, preço, &quot;Comente EU QUERO&quot; e @kliccasa.</p></div></div>
        <div className={s.settings} style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
          <label>Produto
            <select className={s.input} value={itemId} onChange={e => setItemId(e.target.value)} disabled={!!sending}>
              <option value="">{prods.length ? 'Escolha o produto do vídeo…' : 'Carregando produtos da fila do Grupo VIP…'}</option>
              {prods.map(p => <option key={p.item_id} value={p.item_id}>{p.name.slice(0, 80)} — {brl(Number(p.price))}</option>)}
            </select>
          </label>
          {selected?.image && <img src={selected.image} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />}
          <label className={s.drop}>
            <input type="file" accept="video/mp4,video/quicktime,.mp4,.mov" style={{ display: 'none' }} disabled={!!sending}
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {file ? <>🎞️ <b>{file.name}</b> · {(file.size / 1048576).toFixed(1)} MB</> : <>Toque para escolher o vídeo (MP4 ou MOV, até {MAX_MB} MB)</>}
          </label>
          <label>Texto extra na legenda (opcional)
            <input className={s.input} value={extra} maxLength={300} onChange={e => setExtra(e.target.value)} placeholder="Ex.: Montei em 5 minutos e ficou perfeita" disabled={!!sending} />
          </label>
        </div>
        <div className={s.chips}><button className={s.btn} disabled={!!sending} onClick={sendVideo}>{sending || 'ENVIAR VÍDEO'}</button></div>
        {msg && <p className={`${s.hint} ${msg.ok ? s.ok : s.err}`}>{msg.text}</p>}
        <p className={s.hint}>Sem vídeo enviado, o sistema gera sozinho um Reel de 12 s com a foto oficial do produto, para cada horário de Reel.</p>
      </section>

      {videos.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Fila de vídeos</h2><p>🙋 enviado por você · 🤖 gerado das fotos</p></div><button className={`${s.btn} ${s.btnGhost}`} onClick={loadVideos}>ATUALIZAR</button></div>
          <div className={s.jobs}>{videos.map(v => {
            const [label, cls] = STATUS[v.status] ?? [v.status, s.hint]
            return (
              <div key={v.id} className={s.job} style={{ alignItems: 'center' }}>
                <code style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                  {v.cover_url ? <img src={v.cover_url} alt="" style={{ width: 36, height: 64, borderRadius: 6, objectFit: 'cover', flex: 'none' }} /> : null}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.source === 'manual' ? '🙋' : '🤖'} {v.name ?? `item ${v.item_id}`}</span>
                </code>
                <span className={cls} title={v.error ?? ''}>
                  {label}{v.status === 'erro' && v.error ? `: ${v.error.slice(0, 80)}` : ''}
                  {v.video_url && v.status !== 'publicado' ? <> · <a href={v.video_url} target="_blank" rel="noopener noreferrer">ver</a></> : null}
                  {['editar', 'pronto', 'erro'].includes(v.status) ? <> · <a href="#" onClick={e => { e.preventDefault(); cancelVideo(v.id) }}>tirar da fila</a></> : null}
                </span>
              </div>
            )
          })}</div>
          <LastRun kinds={['ig-video']} />
        </section>
      )}

      {posts.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Últimos posts</h2></div></div>
          <div className={s.tList}>{posts.map(p => (
            <a key={p.media_id} className={s.tItem} href={p.permalink ?? '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              {p.image ? <img src={p.image} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} /> : <span />}
              <span><b style={{ fontSize: 13 }}>{p.media_type === 'REELS' ? '🎬 ' : '📷 '}{p.name}</b><small style={{ display: 'block', color: 'var(--text3)' }}>{brl(Number(p.price))} · {new Date(p.posted_at).toLocaleString('pt-BR')}</small></span>
            </a>
          ))}</div>
        </section>
      )}

      {replies.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Quem pediu o link</h2></div></div>
          <div className={s.jobs}>{replies.map(r => (
            <div key={r.comment_id} className={s.job}>
              <code>@{r.username || '—'}: “{r.text}”</code>
              <span className={r.replied_private ? s.ok : s.err}>{r.replied_private ? '✓ direct enviado' : `✕ ${r.error ?? 'pendente'}`}</span>
            </div>
          ))}</div>
        </section>
      )}
    </div>
  )
}

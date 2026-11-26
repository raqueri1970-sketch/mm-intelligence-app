'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee.module.css'
import { LastRun } from '../DailyRanking'
import { ShopeeTabs, brl } from '../shared'

// Instagram automático: status da conexão com a Meta, posts publicados e respostas ao "EU QUERO".
type Config = {
  page_name: string | null; ig_username: string | null; connected_at: string | null; webhook_ok: boolean
  posting_enabled: boolean; post_slots: string[]; reply_text: string; last_error: string | null
}
type Post = { media_id: string; name: string; image: string | null; price: number; permalink: string | null; posted_at: string }
type Reply = { comment_id: string; username: string; text: string; replied_private: boolean; replied_public: boolean; error: string | null; created_at: string }

const SLOTS = ['08:00', '10:00', '12:00', '15:00', '18:00', '20:00', '22:00']

export default function InstagramPage() {
  const [c, setC] = useState<Config | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('mm_ig_config').select('page_name,ig_username,connected_at,webhook_ok,posting_enabled,post_slots,reply_text,last_error').eq('id', 1).maybeSingle()
      .then(({ data }) => setC(data as Config | null))
    supabase.from('mm_ig_posts').select('media_id,name,image,price,permalink,posted_at').order('posted_at', { ascending: false }).limit(20)
      .then(({ data }) => setPosts((data as Post[]) ?? []))
    supabase.from('mm_ig_replies').select('comment_id,username,text,replied_private,replied_public,error,created_at').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setReplies((data as Reply[]) ?? []))
  }, [])

  async function save(patch: Partial<Pick<Config, 'posting_enabled' | 'post_slots'>>) {
    if (!c) return
    setSaving(true)
    const { error } = await supabase.from('mm_ig_config').update(patch).eq('id', 1)
    if (!error) setC({ ...c, ...patch })
    setSaving(false)
  }
  const toggleSlot = (h: string) => {
    if (!c) return
    const set = new Set(c.post_slots); set.has(h) ? set.delete(h) : set.add(h)
    save({ post_slots: SLOTS.filter(x => set.has(x)) })
  }

  const connected = Boolean(c?.connected_at && c.ig_username)
  const today = new Date().toDateString()
  const repliedToday = replies.filter(r => new Date(r.created_at).toDateString() === today && r.replied_private).length

  return (
    <div className={s.page}>
      <div className={s.head}><h1>📸 Instagram automático</h1><p>Posta sozinho as melhores ofertas do dia no @kliccasa e responde no direct quem comenta <b>EU QUERO</b>, com o link de afiliado (Sub ID <b>insta</b>).</p></div>
      <ShopeeTabs />

      <div className={s.stats}>
        <div className={s.stat} style={{ borderColor: connected ? 'rgba(16,185,129,.45)' : 'rgba(245,158,11,.45)' }}>
          <span>Conexão com a Meta</span><strong>{connected ? `@${c!.ig_username}` : 'Aguardando'}</strong>
          <small>{connected ? `página ${c!.page_name} · desde ${new Date(c!.connected_at!).toLocaleDateString('pt-BR')}` : 'falta salvar as chaves (passo a passo abaixo)'}</small>
        </div>
        <div className={s.stat}><span>Posts publicados</span><strong>{posts.length}</strong><small>{c?.posting_enabled ? `nos horários ${c.post_slots.join(' · ')}` : 'posts automáticos desligados'}</small></div>
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
          <div className={s.panelHead}><div><h2>Posts automáticos</h2><p>Em cada horário escolhido, publica no feed a melhor oferta da fila do dia (maior comissão) que ainda não foi postada nos últimos 10 dias.</p></div>
            <button className={c.posting_enabled ? s.btn : `${s.btn} ${s.btnGhost}`} disabled={saving} onClick={() => save({ posting_enabled: !c.posting_enabled })}>{c.posting_enabled ? 'LIGADO ✓' : 'DESLIGADO'}</button>
          </div>
          <div className={s.chips}>{SLOTS.map(h => (
            <button key={h} type="button" disabled={saving} className={`${s.chip} ${c.post_slots.includes(h) ? s.chipOn : ''}`} onClick={() => toggleSlot(h)}>{h}</button>
          ))}</div>
          <p className={s.hint}>Até 7 posts por dia. O Instagram aceita no máximo 50 por dia, mas poucos posts bons rendem mais que muitos.</p>
          <LastRun kinds={['ig-post', 'ig-setup']} />
        </section>
      )}

      {posts.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Últimos posts</h2></div></div>
          <div className={s.tList}>{posts.map(p => (
            <a key={p.media_id} className={s.tItem} href={p.permalink ?? '#'} target="_blank" rel="noopener noreferrer" style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr)', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              {p.image ? <img src={p.image} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} /> : <span />}
              <span><b style={{ fontSize: 13 }}>{p.name}</b><small style={{ display: 'block', color: 'var(--text3)' }}>{brl(Number(p.price))} · {new Date(p.posted_at).toLocaleString('pt-BR')}</small></span>
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

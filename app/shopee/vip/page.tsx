'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee.module.css'
import { ShopeeTabs, brl } from '../shared'
import { LastRun } from '../DailyRanking'

type Settings = {
  niche: string; title: string; group_link: string | null; whatsapp_group_id: string | null; instagram_handle: string | null
  slots: string[]; min_score: number; min_rate: number; min_sales: number; max_per_keyword: number; repeat_days: number; active: boolean
}
type Queue = {
  id: number; item_id: number; keyword: string | null; name: string; image: string | null; price: number; sales: number
  commission: number; commission_rate: number; score: number; affiliate_link: string; message: string; slot_at: string
  status: 'pendente' | 'enviado' | 'cancelado' | 'erro'; sent_via: string | null; error: string | null
}

const NICHE = 'casa'
const BIO_LINK = 'https://mm-intelligence-app.vercel.app/vip?src=bio'
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

export default function VipPage() {
  const [st, setSt] = useState<Settings | null>(null)
  const [form, setForm] = useState<Partial<Settings>>({})
  const [queue, setQueue] = useState<Queue[]>([])
  const [clicks, setClicks] = useState({ today: 0, week: 0 })
  const [sales, setSales] = useState({ orders: 0, commission: 0 })
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState<number | string>()

  const load = useCallback(async () => {
    const { data } = await supabase.from('mm_vip_settings').select('*').eq('niche', NICHE).maybeSingle()
    setSt(data as Settings | null); setForm((data as Settings) ?? {})
    const since = new Date(Date.now() - 2 * 86400000).toISOString()
    const { data: q } = await supabase.from('mm_vip_queue').select('*').eq('niche', NICHE).gte('slot_at', since).order('slot_at', { ascending: false }).limit(40)
    setQueue((q as Queue[]) ?? [])
    const week = new Date(Date.now() - 7 * 86400000).toISOString()
    const startToday = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T00:00:00-03:00').toISOString()
    const [{ count: c7 }, { count: c1 }] = await Promise.all([
      supabase.from('mm_vip_clicks').select('id', { count: 'exact', head: true }).eq('niche', NICHE).gte('clicked_at', week),
      supabase.from('mm_vip_clicks').select('id', { count: 'exact', head: true }).eq('niche', NICHE).gte('clicked_at', startToday),
    ])
    setClicks({ today: c1 ?? 0, week: c7 ?? 0 })
    const { data: conv } = await supabase.from('mm_shopee_conversions').select('conversion_id,commission').eq('sub1', 'zapvip').gte('purchase_time', new Date(Date.now() - 30 * 86400000).toISOString())
    const rows = (conv as { conversion_id: string; commission: number }[]) ?? []
    setSales({ orders: new Set(rows.map(r => r.conversion_id)).size, commission: rows.reduce((t, r) => t + Number(r.commission || 0), 0) })
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    const link = (form.group_link || '').trim()
    if (link && !/^https:\/\/(chat\.whatsapp\.com|(www\.)?whatsapp\.com\/channel)\//i.test(link)) { setMsg('Cole o link de convite do grupo (https://chat.whatsapp.com/...).'); return }
    const { error } = await supabase.from('mm_vip_settings').update({
      group_link: link || null, whatsapp_group_id: (form.whatsapp_group_id || '').trim() || null,
      instagram_handle: (form.instagram_handle || '').replace('@', '').trim() || null,
      min_score: Number(form.min_score), min_rate: Number(form.min_rate), min_sales: Number(form.min_sales), active: !!form.active,
      updated_at: new Date().toISOString(),
    }).eq('niche', NICHE)
    setMsg(error ? error.message : 'Salvo ✓'); load()
  }

  async function mark(q: Queue, status: Queue['status']) {
    await supabase.from('mm_vip_queue').update(status === 'enviado' ? { status, sent_via: 'manual', sent_at: new Date().toISOString() } : { status }).eq('id', q.id)
    load()
  }
  function copy(text: string, key: number | string) { navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(undefined), 1500) }

  const now = Date.now()
  const auto = Boolean(st?.whatsapp_group_id)
  const days = [...new Set(queue.map(q => dayKey(q.slot_at)))]
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className={s.page}>
      <div className={s.head}><h1>Grupo VIP · Casa em Conta</h1><p>Todo dia o MM escolhe as melhores ofertas de casa e cozinha, gera seu link de afiliado (Sub ID <b>zapvip</b>) e agenda uma mensagem por horário.</p></div>
      <ShopeeTabs />

      <div className={s.stats}>
        <div className={s.stat}><span>Cliques na bio</span><strong>{clicks.today}</strong><small>hoje · {clicks.week} em 7 dias</small></div>
        <div className={s.stat}><span>Postadas hoje</span><strong>{queue.filter(q => q.status === 'enviado' && dayKey(q.slot_at) === dayKey(new Date().toISOString())).length}</strong><small>de {st?.slots.length ?? 5} horários</small></div>
        <div className={s.stat}><span>Pedidos do grupo</span><strong>{sales.orders}</strong><small>últimos 30 dias</small></div>
        <div className={s.stat}><span>Comissão do grupo</span><strong>{brl(sales.commission)}</strong><small>Sub ID zapvip · 30 dias</small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Link da bio do Instagram</h2><p>Coloque este link na bio da @{st?.instagram_handle || 'casaemconta'}. Ele conta os cliques e abre o grupo.</p></div>
          <button className={s.btn} onClick={() => copy(BIO_LINK, 'bio')}>{copied === 'bio' ? 'COPIADO ✓' : 'COPIAR LINK DA BIO'}</button></div>
        <code style={{ fontSize: 13, color: 'var(--text2)' }}>{BIO_LINK}</code>
        {!st?.group_link && <p className={`${s.hint} ${s.wait}`}>Falta o link de convite do grupo: enquanto isso, quem clicar vê “o grupo abre em breve”.</p>}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Fila de ofertas</h2><p>{auto ? 'Envio automático ligado: o MM posta sozinho no horário.' : 'Envio automático ainda não ligado: no horário, copie a mensagem e poste no grupo (2 cliques).'}</p></div>
          <span className={s.badge}>{queue.filter(q => q.status === 'pendente').length} PENDENTES</span></div>
        <LastRun kinds={['vip-build', 'vip-send']} />
        {queue.length === 0 && <p className={s.hint} style={{ fontSize: 13 }}>A primeira fila é montada às 08h45, depois do garimpo das 08h20.</p>}
        {days.map(d => (
          <div key={d}>
            <h3 style={{ fontSize: 14, margin: '16px 0 8px', color: 'var(--text2)' }}>{d}</h3>
            <div className={s.list}>{queue.filter(q => dayKey(q.slot_at) === d).sort((a, b) => a.slot_at.localeCompare(b.slot_at)).map(q => {
              const due = new Date(q.slot_at).getTime() <= now
              return (
                <div key={q.id} className={s.item} style={{ gridTemplateColumns: '64px 72px 1fr auto', alignItems: 'start', opacity: q.status === 'cancelado' ? .45 : 1 }}>
                  <b className={s.rank}>{hhmm(q.slot_at)}</b>
                  {q.image ? <img src={q.image} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} /> : <span />}
                  <div>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, margin: 0 }}>{q.message}</pre>
                    <small>{q.keyword} · score {Math.round(q.score)} · comissão {brl(Number(q.commission))} ({Number(q.commission_rate).toFixed(0)}%)</small>
                    <small className={q.status === 'enviado' ? s.ok : q.status === 'erro' ? s.err : due ? s.wait : undefined}>
                      {q.status === 'enviado' ? `✓ postada${q.sent_via === 'zapi' ? ' automaticamente' : ''}` : q.status === 'erro' ? `✕ ${q.error}` : q.status === 'cancelado' ? 'cancelada' : due ? '● hora de postar' : '○ agendada'}
                    </small>
                  </div>
                  <div className={s.actions} style={{ flexDirection: 'column' }}>
                    <button className={s.btn} onClick={() => copy(q.message, q.id)}>{copied === q.id ? 'COPIADO ✓' : 'COPIAR'}</button>
                    <a className={`${s.btn} ${s.btnGhost}`} href={`https://wa.me/?text=${encodeURIComponent(q.message)}`} target="_blank" rel="noopener noreferrer">WHATSAPP ↗</a>
                    {q.status !== 'enviado' && <button className={`${s.btn} ${s.btnGhost}`} onClick={() => mark(q, 'enviado')}>JÁ POSTEI</button>}
                    {q.status === 'pendente' && <button className={`${s.btn} ${s.btnGhost}`} onClick={() => mark(q, 'cancelado')}>PULAR</button>}
                    {q.status === 'cancelado' && <button className={`${s.btn} ${s.btnGhost}`} onClick={() => mark(q, 'pendente')}>VOLTAR</button>}
                  </div>
                </div>
              )
            })}</div>
          </div>
        ))}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Configuração do grupo</h2><p>Horários: {st?.slots.join(' · ')}. Só entram ofertas que passam nos filtros e que não foram postadas nos últimos {st?.repeat_days ?? 7} dias.</p></div></div>
        <div className={s.row}>
          <input className={`${s.input} ${s.grow}`} placeholder="Link de convite do grupo (https://chat.whatsapp.com/...)" value={form.group_link ?? ''} onChange={e => setForm(f => ({ ...f, group_link: e.target.value }))} />
          <input className={s.input} placeholder="@ do Instagram" value={form.instagram_handle ?? ''} onChange={e => setForm(f => ({ ...f, instagram_handle: e.target.value }))} />
        </div>
        <div className={s.row}>
          <input className={`${s.input} ${s.grow}`} placeholder="ID do grupo na Z-API (ex: 1203630...-group) — liga o envio automático" value={form.whatsapp_group_id ?? ''} onChange={e => setForm(f => ({ ...f, whatsapp_group_id: e.target.value }))} />
        </div>
        <div className={s.row}>
          <label className={s.hint}>Score mín. <input className={s.input} style={{ width: 80 }} type="number" value={form.min_score ?? ''} onChange={num('min_score')} /></label>
          <label className={s.hint}>Comissão mín. % <input className={s.input} style={{ width: 80 }} type="number" value={form.min_rate ?? ''} onChange={num('min_rate')} /></label>
          <label className={s.hint}>Vendas mín. <input className={s.input} style={{ width: 100 }} type="number" value={form.min_sales ?? ''} onChange={num('min_sales')} /></label>
          <label className={s.hint}><input type="checkbox" checked={!!form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> Grupo ativo</label>
          <button className={s.btn} onClick={save}>SALVAR</button>
        </div>
        {msg && <div className={`${s.hint} ${msg.startsWith('Salvo') ? s.ok : s.err}`}>{msg}</div>}
        <p className={s.hint}>Envio automático: crie uma instância na Z-API com o chip do grupo e peça para eu guardar as chaves no cofre do Supabase (mm_zapi_instance, mm_zapi_token, mm_zapi_client_token). Nunca cole chaves aqui.</p>
      </section>
    </div>
  )
}

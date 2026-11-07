'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from './shopee.module.css'
import { brl } from './shared'

type Pick = {
  id: number; intent: string; keyword: string; product_name: string; price: number | null; sales: number | null
  commission: number | null; commission_rate: number | null; affiliate_link: string; hook: string | null
  priority: number; note: string | null; picked_at: string
  search_term: string | null; youtube_url: string | null; youtube_title: string | null
}
type Live = { keyword: string; sales: number; commission: number }


// Onde ver o mesmo produto: vídeo real no YouTube (achado pela API) + buscas no TikTok, Amazon e Mercado Livre.
function elsewhere(p: Pick) {
  const q = encodeURIComponent(p.search_term || p.product_name)
  return [
    { label: '▶ YouTube', href: p.youtube_url || `https://www.youtube.com/results?search_query=${q}`, title: p.youtube_title || 'buscar no YouTube' },
    { label: '♪ TikTok', href: `https://www.tiktok.com/search/video?q=${q}`, title: 'vídeos no TikTok' },
    { label: 'Amazon', href: `https://www.amazon.com.br/s?k=${q}`, title: 'mesmo produto na Amazon' },
    { label: 'Mercado Livre', href: `https://lista.mercadolivre.com.br/${encodeURIComponent((p.search_term || p.product_name).replace(/\s+/g, '-'))}`, title: 'mesmo produto no Mercado Livre' },
  ]
}
function Links({ p }: { p: Pick }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>{elsewhere(p).map(l => (
    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" title={l.title} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--text2)', textDecoration: 'none' }}>{l.label} ↗</a>
  ))}</div>
}

// Oportunidades de campanha (ex.: Natal): o que as pessoas buscam no Google → produto certo na Shopee.
export default function ChristmasPicks({ campaign = 'natal', onSubId }: { campaign?: string; onSubId: (link: string, name: string) => void }) {
  const [picks, setPicks] = useState<Pick[]>([])
  const [live, setLive] = useState<Record<string, Live>>({})
  const [copied, setCopied] = useState<number>()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    supabase.from('mm_shopee_picks').select('*').eq('campaign', campaign).eq('active', true).order('priority').order('commission', { ascending: false })
      .then(({ data }) => setPicks((data as Pick[]) ?? []))
    // destaque do dia: o melhor produto minerado hoje para cada palavra da campanha
    supabase.from('mm_shopee_keywords').select('keyword').eq('campaign', campaign).then(async ({ data: kws }) => {
      const list = (kws ?? []).map((k: { keyword: string }) => k.keyword)
      if (!list.length) return
      const { data: last } = await supabase.from('mm_shopee_offers').select('run_date').order('run_date', { ascending: false }).limit(1)
      const day = last?.[0]?.run_date
      if (!day) return
      const { data } = await supabase.from('mm_shopee_offers').select('keyword,sales,commission').eq('run_date', day).in('keyword', list)
      const best: Record<string, Live> = {}
      for (const o of (data as Live[]) ?? []) if (!best[o.keyword] || Number(o.sales) > Number(best[o.keyword].sales)) best[o.keyword] = o
      setLive(best)
    })
  }, [campaign])

  const groups = useMemo(() => {
    const m = new Map<string, Pick[]>()
    for (const p of picks) m.set(p.intent, [...(m.get(p.intent) ?? []), p])
    return [...m.entries()].sort((a, b) => Math.min(...a[1].map(x => x.priority)) - Math.min(...b[1].map(x => x.priority)))
  }, [picks])

  if (!picks.length) return null
  const top = picks.filter(p => p.priority === 1)

  return (
    <section className={s.panel} style={{ borderColor: 'rgba(239,68,68,.45)', background: 'linear-gradient(180deg, rgba(239,68,68,.07), var(--card) 40%)' }}>
      <div className={s.panelHead}>
        <div>
          <h2>🎄 Oportunidades de Natal</h2>
          <p>O que o pessoal está buscando no Google para presentear → o produto certo na Shopee, com seu link de afiliado. Pesquisado em {new Date(picks[0].picked_at).toLocaleDateString('pt-BR')}; os números do dia vêm do minerador automático.</p>
        </div>
        <div className={s.row}>
          <span className={s.badge} style={{ borderColor: 'rgba(239,68,68,.5)', color: '#fca5a5', background: 'rgba(239,68,68,.12)' }}>{top.length} APOSTAS · {picks.length} PRODUTOS</span>
          <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setOpen(o => !o)}>{open ? 'RECOLHER' : 'ABRIR'}</button>
        </div>
      </div>

      {open && <>
        <div className={s.cards} style={{ marginBottom: 14 }}>
          {top.map(p => (
            <div key={p.id} className={s.card} style={{ borderColor: 'rgba(239,68,68,.35)' }}>
              <span style={{ color: '#fca5a5' }}>★ APOSTA · {p.intent.toUpperCase()}</span><br />
              <b>{p.product_name}</b>
              <p>{p.price ? brl(Number(p.price)) : '—'} · <b style={{ color: '#34d399' }}>{p.commission ? brl(Number(p.commission)) : '—'} por venda</b> ({p.commission_rate}%) · {Number(p.sales ?? 0).toLocaleString('pt-BR')} vendidos</p>
              {p.hook && <p style={{ fontStyle: 'italic' }}>“{p.hook}”</p>}
              <p style={{ fontSize: 11, marginTop: 6 }}>Link Shopee: <a href={p.affiliate_link} target="_blank" rel="noopener noreferrer" style={{ color: "#fb923c" }}>{p.affiliate_link}</a></p>
              <Links p={p} />
              <div className={s.actions} style={{ marginTop: 8 }}>
                <button className={`${s.btn} ${s.btnGhost}`} onClick={() => { navigator.clipboard?.writeText(p.affiliate_link); setCopied(p.id) }}>{copied === p.id ? 'COPIADO ✓' : 'COPIAR LINK'}</button>
                <button className={s.btn} onClick={() => onSubId(p.affiliate_link, p.product_name)}>SUB ID →</button>
              </div>
            </div>
          ))}
        </div>

        <div className={s.tableWrap}><table className={s.table}>
          <thead><tr><th>O que buscam</th><th>Produto na Shopee</th><th>Preço</th><th>Vendas</th><th>Comissão</th><th>Gancho</th><th>Ações</th></tr></thead>
          <tbody>{groups.flatMap(([intent, list]) => list.map((p, i) => {
            const l = live[p.keyword]
            return (
              <tr key={p.id}>
                <td>{i === 0 ? <b>{intent}</b> : ''}</td>
                <td>{p.priority === 1 && <span style={{ color: '#fca5a5' }}>★ </span>}<a href={p.affiliate_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text)' }}>{p.product_name} ↗</a>{p.note && <small style={{ display: 'block', color: 'var(--text3)' }}>{p.note}</small>}<Links p={p} /></td>
                <td>{p.price ? brl(Number(p.price)) : '—'}</td>
                <td>{Number(p.sales ?? 0).toLocaleString('pt-BR')}{l && <small style={{ display: 'block', color: 'var(--text3)' }}>hoje: top “{p.keyword}” {Number(l.sales).toLocaleString('pt-BR')}</small>}</td>
                <td><b style={{ color: '#34d399' }}>{p.commission ? brl(Number(p.commission)) : '—'}</b><small style={{ display: 'block', color: 'var(--text3)' }}>{p.commission_rate}%</small></td>
                <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--text2)' }}>{p.hook}</td>
                <td><div className={s.actions}>
                  <button className={`${s.btn} ${s.btnGhost}`} onClick={() => { navigator.clipboard?.writeText(p.affiliate_link); setCopied(p.id) }}>{copied === p.id ? '✓' : 'COPIAR'}</button>
                  <button className={s.btn} onClick={() => onSubId(p.affiliate_link, p.product_name)}>SUB ID</button>
                </div></td>
              </tr>
            )
          }))}</tbody>
        </table></div>
        <p className={s.hint}>Preço e comissão mudam todo dia na Shopee — confira no app antes de investir em anúncio. Evite termos proibidos (“clareador”, “melasma”, “100%”) no texto do vídeo.</p>
      </>}
    </section>
  )
}

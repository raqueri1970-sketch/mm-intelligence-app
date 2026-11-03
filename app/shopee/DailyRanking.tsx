'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from './shopee.module.css'
import { brl } from './shared'

type Offer = { item_id: number; name: string; shop: string | null; keyword: string; price: number; sales: number; rating: number; commission: number; commission_rate: number; score: number; image: string | null; affiliate_link: string | null; product_link: string | null; run_date: string }
type Keyword = { keyword: string; active: boolean }
type Run = { kind: string; ok: boolean; message: string; ran_at: string }

export function LastRun({ kinds }: { kinds: string[] }) {
  const [run, setRun] = useState<Run | null>(null)
  const key = kinds.join(',')
  useEffect(() => {
    supabase.from('mm_shopee_runs').select('kind,ok,message,ran_at').in('kind', key.split(',')).order('id', { ascending: false }).limit(1)
      .then(({ data }) => setRun((data?.[0] as Run) ?? null))
  }, [key])
  if (!run) return <p className={s.hint}>A rotina automática ainda não rodou.</p>
  return <p className={`${s.hint} ${run.ok ? s.ok : s.wait}`}>Última execução automática: {new Date(run.ran_at).toLocaleString('pt-BR')} — {run.message}</p>
}

export default function DailyRanking({ onSubId }: { onSubId: (link: string, name: string) => void }) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [newKw, setNewKw] = useState('')
  const [filter, setFilter] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data: last } = await supabase.from('mm_shopee_offers').select('run_date').order('run_date', { ascending: false }).limit(1)
    const day = last?.[0]?.run_date
    if (day) {
      const { data } = await supabase.from('mm_shopee_offers').select('*').eq('run_date', day).order('score', { ascending: false }).limit(200)
      setOffers((data as Offer[]) ?? [])
    }
    const { data: kws } = await supabase.from('mm_shopee_keywords').select('keyword,active').order('keyword')
    setKeywords((kws as Keyword[]) ?? [])
  }, [])
  useEffect(() => { load() }, [load])

  async function addKw() {
    const k = newKw.trim().toLowerCase()
    if (k.length < 2) return
    const { error } = await supabase.from('mm_shopee_keywords').insert({ keyword: k })
    setMsg(error ? (error.code === '23505' ? 'Essa palavra já está na lista.' : error.message) : '')
    setNewKw(''); load()
  }
  async function toggle(k: Keyword) { await supabase.from('mm_shopee_keywords').update({ active: !k.active }).eq('keyword', k.keyword); load() }
  async function remove(k: Keyword) { await supabase.from('mm_shopee_keywords').delete().eq('keyword', k.keyword); load() }

  const shown = offers.filter(o => !filter || o.keyword === filter)
  const activeCount = keywords.filter(k => k.active).length

  return (
    <>
      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Ranking diário automático</h2><p>Todo dia às 08h20 o MM busca os mais vendidos de cada palavra-chave abaixo e guarda o top 20 de cada uma — sem você precisar abrir nada.</p></div><span className={s.badge}>{offers.length ? `${offers.length} OFERTAS · ${new Date(offers[0].run_date + 'T12:00').toLocaleDateString('pt-BR')}` : 'SEM DADOS AINDA'}</span></div>
        <LastRun kinds={['all', 'mine']} />
        {offers.length === 0 ? (
          <p className={s.hint} style={{ fontSize: 13 }}>O ranking aparece aqui na primeira execução depois que a Open API for liberada e as chaves estiverem na Vercel.</p>
        ) : (
          <>
            <div className={s.chips}>
              <button className={`${s.chip} ${!filter ? s.chipOn : ''}`} onClick={() => setFilter('')}>Todas</button>
              {[...new Set(offers.map(o => o.keyword))].map(k => <button key={k} className={`${s.chip} ${filter === k ? s.chipOn : ''}`} onClick={() => setFilter(k)}>{k}</button>)}
            </div>
            <div className={s.tableWrap}><table className={s.table}>
              <thead><tr><th>Score</th><th></th><th>Produto</th><th>Preço</th><th>Vendas</th><th>Comissão</th><th>Ações</th></tr></thead>
              <tbody>{shown.slice(0, 100).map(o => (
                <tr key={o.item_id}>
                  <td className={s.score}>{Math.round(o.score)}</td>
                  <td>{o.image && <img src={o.image} alt="" />}</td>
                  <td>{o.name}<small style={{ display: 'block', color: 'var(--text3)' }}>{o.keyword} · {o.shop}</small></td>
                  <td>{brl(Number(o.price))}</td><td>{Number(o.sales).toLocaleString('pt-BR')}</td>
                  <td>{brl(Number(o.commission))}<small style={{ display: 'block', color: 'var(--text3)' }}>{Number(o.commission_rate).toFixed(1)}%</small></td>
                  <td><div className={s.actions}>
                    {o.affiliate_link && <button className={`${s.btn} ${s.btnGhost}`} onClick={() => navigator.clipboard?.writeText(o.affiliate_link!)}>COPIAR LINK</button>}
                    {o.product_link && <button className={s.btn} onClick={() => onSubId(o.product_link!, o.name)}>SUB ID →</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
          </>
        )}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Palavras-chave do minerador automático</h2><p>O que o MM pesquisa todo dia. Clique para pausar/ativar.</p></div><span className={s.badge}>{activeCount} ATIVAS</span></div>
        <div className={s.row}>
          <input className={`${s.input} ${s.grow}`} value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKw()} placeholder="adicionar palavra-chave (ex: serum vitamina c)" />
          <button className={s.btn} onClick={addKw} disabled={newKw.trim().length < 2}>ADICIONAR</button>
        </div>
        {msg && <div className={`${s.hint} ${s.err}`}>{msg}</div>}
        <div className={s.chips}>{keywords.map(k => (
          <span key={k.keyword} className={`${s.chip} ${k.active ? s.chipOn : ''}`}>
            <span onClick={() => toggle(k)} title={k.active ? 'Pausar' : 'Ativar'}>{k.active ? '●' : '○'} {k.keyword}</span>
            <span onClick={() => remove(k)} title="Remover" style={{ opacity: .6, marginLeft: 4 }}>✕</span>
          </span>
        ))}</div>
      </section>
    </>
  )
}

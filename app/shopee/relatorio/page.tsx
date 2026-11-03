'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee.module.css'
import { LastRun } from '../DailyRanking'
import { ShopeeTabs, brl } from '../shared'

type Conv = { conversion_id: string; item_id: number; purchase_time: string | null; item_name: string | null; order_status: string | null; qty: number; commission: number; sub1: string | null; sub2: string | null; sub3: string | null; sub4: string | null }
type Dim = 'sub1' | 'sub2' | 'sub3' | 'sub4'
const DIMS: { id: Dim; label: string; hint: string }[] = [
  { id: 'sub1', label: 'Por rede', hint: 'tiktok, shopeevideo, reels…' },
  { id: 'sub2', label: 'Por produto', hint: 'código do produto' },
  { id: 'sub3', label: 'Por vídeo', hint: 'remix01, remix02…' },
  { id: 'sub4', label: 'Por gancho', hint: 'g1, g2…' },
]
const PERIODS = [7, 30, 90]

export default function RelatorioPage() {
  const [rows, setRows] = useState<Conv[]>([])
  const [days, setDays] = useState(30)
  const [dim, setDim] = useState<Dim>('sub3')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const since = new Date(Date.now() - days * 86400000).toISOString()
    supabase.from('mm_shopee_conversions').select('conversion_id,item_id,purchase_time,item_name,order_status,qty,commission,sub1,sub2,sub3,sub4')
      .gte('purchase_time', since).order('purchase_time', { ascending: false }).limit(2000)
      .then(({ data }) => { setRows((data as Conv[]) ?? []); setLoading(false) })
  }, [days])

  const total = rows.reduce((a, r) => a + Number(r.commission || 0), 0)
  const orders = new Set(rows.map(r => r.conversion_id)).size
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; commission: number; items: number; orders: Set<string> }>()
    for (const r of rows) {
      const key = r[dim] || '(sem sub id)'
      const g = m.get(key) ?? { key, commission: 0, items: 0, orders: new Set<string>() }
      g.commission += Number(r.commission || 0); g.items += Number(r.qty || 1); g.orders.add(r.conversion_id)
      m.set(key, g)
    }
    return [...m.values()].sort((a, b) => b.commission - a.commission)
  }, [rows, dim])
  const max = Math.max(0.01, ...groups.map(g => g.commission))
  const best = groups.find(g => g.key !== '(sem sub id)')

  return (
    <div className={s.page}>
      <div className={s.head}><h1>Relatório de vendas</h1><p>Comissões por Sub ID: descubra qual rede, produto, vídeo e gancho estão vendendo. Sincroniza sozinho todo dia às 08h20.</p></div>
      <ShopeeTabs />
      <LastRun kinds={['all', 'conversions']} />

      <div className={s.stats}>
        <div className={s.stat}><span>Comissão no período</span><strong>{brl(total)}</strong><small>últimos {days} dias</small></div>
        <div className={s.stat}><span>Pedidos</span><strong>{orders}</strong><small>{rows.length} itens vendidos</small></div>
        <div className={s.stat}><span>Melhor {DIMS.find(d => d.id === dim)!.label.replace('Por ', '')}</span><strong style={{ fontSize: 20 }}>{best ? best.key : '—'}</strong><small>{best ? brl(best.commission) : 'sem vendas com Sub ID ainda'}</small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div><h2>Quem está vendendo</h2><p>{DIMS.find(d => d.id === dim)!.hint}</p></div>
          <div className={s.row}>{PERIODS.map(p => <button key={p} className={`${s.chip} ${days === p ? s.chipOn : ''}`} onClick={() => setDays(p)}>{p} dias</button>)}</div>
        </div>
        <div className={s.chips} style={{ marginTop: 0, marginBottom: 12 }}>{DIMS.map(d => <button key={d.id} className={`${s.chip} ${dim === d.id ? s.chipOn : ''}`} onClick={() => setDim(d.id)}>{d.label}</button>)}</div>
        {loading ? <p className={s.hint}>Carregando…</p> : groups.length === 0 ? (
          <p className={s.hint} style={{ fontSize: 13 }}>Nenhuma venda registrada no período. As vendas aparecem aqui depois que a Open API for liberada e você postar vídeos com links de Sub ID.</p>
        ) : (
          <div className={s.jobs}>{groups.map(g => (
            <div key={g.key} className={s.job} style={{ gridTemplateColumns: 'minmax(120px,200px) 1fr auto', alignItems: 'center' }}>
              <b style={{ fontFamily: 'var(--mono)' }}>{g.key}</b>
              <div className={s.bar} style={{ marginTop: 0 }}><i style={{ width: `${(g.commission / max) * 100}%` }} /></div>
              <span><b>{brl(g.commission)}</b> <small style={{ color: 'var(--text3)' }}>· {g.orders.size} pedidos</small></span>
            </div>
          ))}</div>
        )}
      </section>

      {rows.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Últimas vendas</h2></div></div>
          <div className={s.tableWrap}><table className={s.table}>
            <thead><tr><th>Data</th><th>Produto</th><th>Status</th><th>Sub IDs</th><th>Comissão</th></tr></thead>
            <tbody>{rows.slice(0, 50).map(r => (
              <tr key={r.conversion_id + r.item_id}>
                <td>{r.purchase_time ? new Date(r.purchase_time).toLocaleDateString('pt-BR') : '—'}</td>
                <td>{r.item_name}</td><td>{r.order_status}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{[r.sub1, r.sub2, r.sub3, r.sub4].filter(Boolean).join(' / ') || '—'}</td>
                <td>{brl(Number(r.commission))}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </div>
  )
}

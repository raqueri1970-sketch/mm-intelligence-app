'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

function Ring({ score, size }: { score: number; size?: number }) {
  const s = size || 48
  const r = (s - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = (Math.min(score, 100) / 100) * circ
  const color = score >= 80 ? '#f59e0b' : score >= 65 ? '#10b981' : score >= 45 ? '#fcd34d' : '#ef4444'
  return (
    <div className="mm-score-ring" style={{ width: s, height: s }}>
      <svg width={s} height={s} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={fill + ' ' + circ} strokeLinecap="round" />
      </svg>
      <span className="mm-score-ring__val" style={{ color, fontSize: 12 }}>{score}</span>
    </div>
  )
}

function Timing({ t }: { t: string }) {
  const key = (t || '').replace(/ .*/g, '') || 'AMARELO'
  const labels: Record<string, string> = {
    OURO: 'OURO', VERDE: 'VERDE', AMARELO: 'AMARELO', VERMELHO: 'VERMELHO'
  }
  return <span className={'mm-timing mm-timing--' + key}>{labels[key] || t}</span>
}

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([])
  const [alerts, setAlerts]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    Promise.all([
      supabase.from('ranking_view').select('*').limit(20),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(5),
    ]).then(([{ data: p }, { data: a }]) => {
      if (p) setProducts(p)
      if (a) setAlerts(a)
      setLoading(false)
    })
  }, [])

  const filtered = products.filter((p) => {
    if (filter === 'gold')   return p.timing?.includes('OURO')
    if (filter === 'green')  return p.timing?.includes('VERDE')
    if (filter === 'winner') return p.status === 'winner'
    if (filter === 'mx')     return p.mx_compatible
    return true
  })

  if (loading) {
    return (
      <div className="mm-loading">
        <div className="mm-spinner" />
        Carregando...
      </div>
    )
  }

  const gold    = products.filter((p) => p.timing?.includes('OURO')).length
  const green   = products.filter((p) => p.timing?.includes('VERDE')).length
  const winners = products.filter((p) => p.status === 'winner').length
  const avg     = products.length
    ? Math.round(products.reduce((s, p) => s + (p.score_final || 0), 0) / products.length)
    : 0

  const stats = [
    ['total', products.length,  'Total Produtos'],
    ['gold',  gold,             'Timing Ouro'],
    ['green', green,            'Timing Verde'],
    ['win',   winners,          'Vencedores'],
    ['avg',   avg,              'Score Medio'],
    ['ads',   products.filter((p) => (p.n_ads || 0) >= 40).length, '40+ Ads'],
  ]

  return (
    <div className="mm-fade-in">
      <div className="mm-page-header">
        <h1 className="mm-page-title">MM Intelligence</h1>
        <p className="mm-page-subtitle">Score MM · IA Analista · Timing de Entrada</p>
      </div>

      <div className="mm-stats mm-stagger">
        {stats.map(([k, v, l]) => (
          <div key={k as string} className="mm-stat">
            <span className="mm-stat__val">{v}</span>
            <span className="mm-stat__label">{l as string}</span>
          </div>
        ))}
      </div>

      <div className="mm-card" style={{ marginBottom: 16 }}>
        <div className="mm-card__header">
          <span className="mm-card__title">Ranking de Produtos</span>
          <Link href="/produtos" className="mm-btn mm-btn--outline mm-btn--sm">
            Ver todos
          </Link>
        </div>

        <div className="mm-filters" style={{ padding: '12px 20px 0' }}>
          {[['all','Todos'],['gold','Ouro'],['green','Verde'],['winner','Winner'],['mx','MX']].map(([k, v]) => (
            <button
              key={k}
              className={'mm-filter-btn' + (filter === k ? ' mm-filter-btn--active' : '')}
              onClick={() => setFilter(k)}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="mm-table-wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Score</th>
                <th>MM%</th>
                <th>Timing</th>
                <th>Nicho</th>
                <th>Fonte</th>
                <th>Ads</th>
                <th>CPA</th>
                <th>Margem</th>
                <th>Status</th>
                <th>Ver</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td>
                      <div className="mm-prod-cell">
                        <span className="mm-prod-cell__name">{p.name}</span>
                        <span className="mm-prod-cell__es">{p.name_es}</span>
                      </div>
                    </td>
                    <td><Ring score={Math.round(p.score_final || 0)} /></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--purple2)' }}>
                      {p.mm_pct ? Math.round(p.mm_pct) + '%' : '—'}
                    </td>
                    <td><Timing t={p.timing} /></td>
                    <td><span className="mm-niche">{p.niche}</span></td>
                    <td><span className={'mm-source mm-source--' + p.source}>{p.source}</span></td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.n_ads || '—'}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>
                      {p.cpa_ideal ? '$' + p.cpa_ideal : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      {p.margin_pct ? p.margin_pct.toFixed(1) + '%' : '—'}
                    </td>
                    <td><span className={'mm-status mm-status--' + p.status}>{p.status}</span></td>
                    <td>
                      <Link href={'/produtos/' + p.id} className="mm-btn mm-btn--outline mm-btn--sm">
                        MM
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mm-grid-2" style={{ gap: 16 }}>
        <div className="mm-card">
          <div className="mm-card__header">
            <span className="mm-card__title">Alertas</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
              {alerts.filter((a) => !a.is_read).length} novos
            </span>
          </div>
          <div className="mm-card__body">
            {alerts.length === 0 ? (
              <div className="mm-empty" style={{ padding: 24 }}>
                <div className="mm-empty__desc">Nenhum alerta ainda</div>
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className={'mm-alert-item' + (!a.is_read ? ' mm-alert-item--unread' : '')}>
                  <div>
                    <div className="mm-alert-item__title">{a.title}</div>
                    <div className="mm-alert-item__msg">{a.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mm-card">
          <div className="mm-card__header">
            <span className="mm-card__title">Janelas de Oportunidade</span>
          </div>
          <div className="mm-card__body">
            {products
              .filter((p) => p.window_mx_days > 0)
              .sort((a, b) => a.window_mx_days - b.window_mx_days)
              .slice(0, 5)
              .map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      MX {p.window_mx_days} dias restantes
                    </div>
                  </div>
                  <Timing t={p.timing} />
                </div>
              ))}
            {products.filter((p) => p.window_mx_days > 0).length === 0 && (
              <div className="mm-empty" style={{ padding: 24 }}>
                <div className="mm-empty__desc">Rode o minerador para ver janelas</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

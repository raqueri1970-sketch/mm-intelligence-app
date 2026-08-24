'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Health = {
  source_name: string
  status: string
  last_ok_at: string | null
  last_fail_at: string | null
  last_error: string | null
  last_check_at: string | null
  metadata: any
}

type Signal = {
  source_name: string
  title: string | null
  url: string | null
  score: number | null
  observed_at: string | null
}

type Guard = {
  source: string
  month: string
  limit_per_month: number
  used: number
  updated_at: string
}

function fmtDate(v?: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })
}

function statusColor(s: string) {
  if (s === 'OK') return '#10b981'
  if (s === 'DEGRADED') return '#f59e0b'
  if (s === 'DOWN') return '#ef4444'
  return '#9ca3af'
}

export default function TikTokPage() {
  const [health, setHealth] = useState<Health[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('mm_source_health').select('*').in('source_name', ['TikTok', 'TikTok Ads']).order('source_name'),
      supabase.from('mm_source_signals').select('source_name,title,url,score,observed_at').in('source_name', ['TikTok', 'TikTok Ads']).order('observed_at', { ascending: false }).limit(20),
      supabase.from('mm_free_tier_guard').select('source,month,limit_per_month,used,updated_at').in('source', ['tiktok', 'tiktokAds']).order('source'),
    ]).then(([h, s, g]) => {
      setHealth((h.data || []) as Health[])
      setSignals((s.data || []) as Signal[])
      setGuards((g.data || []) as Guard[])
      setLoading(false)
    })
  }, [])

  const latest = useMemo(() => {
    const map: Record<string, Signal | undefined> = {}
    for (const s of signals) if (!map[s.source_name]) map[s.source_name] = s
    return map
  }, [signals])

  const stale = (name: string) => {
    const d = latest[name]?.observed_at
    if (!d) return true
    return Date.now() - new Date(d).getTime() > 24 * 60 * 60 * 1000
  }

  if (loading) return <div style={{ padding: 48, color: 'var(--text3)' }}>Carregando diagnóstico do TikTok...</div>

  return <div style={{ paddingBottom: 32 }}>
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, margin: 0, color: 'var(--text)' }}>TikTok — Saúde da Fonte</h1>
      <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>A MM só considera o TikTok forte quando há dados recentes. Janela de frescor: 24h.</p>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12, marginBottom: 18 }}>
      {['TikTok', 'TikTok Ads'].map(name => {
        const h = health.find(x => x.source_name === name)
        const l = latest[name]
        const isStale = stale(name)
        const display = isStale ? 'DEGRADED' : (h?.status || 'UNKNOWN')
        return <div key={name} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}>{name}</strong>
            <span style={{ color: statusColor(display), border: `1px solid ${statusColor(display)}55`, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>{display}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            <div>Último sinal: <b style={{ color: 'var(--text)' }}>{fmtDate(l?.observed_at)}</b></div>
            <div>Última checagem: <b style={{ color: 'var(--text)' }}>{fmtDate(h?.last_check_at)}</b></div>
            <div>Modo: <b style={{ color: 'var(--text)' }}>{h?.metadata?.fallback === 'PUBLIC_WEB' ? 'Fallback público gratuito' : 'API gratuita / monitorada'}</b></div>
          </div>
          {(isStale || h?.last_error) && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,.08)', color: '#f59e0b', fontSize: 11 }}>
            {h?.last_error || 'Dados fora da janela de 24h; não usar como evidência forte.'}
          </div>}
        </div>
      })}
    </div>

    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>Cota gratuita atual</div>
      <div style={{ padding: 16, display: 'grid', gap: 10 }}>
        {guards.map(g => {
          const pct = g.limit_per_month ? Math.min(100, Math.round(g.used / g.limit_per_month * 100)) : 0
          return <div key={g.source}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text3)', fontSize: 12 }}>
              <span>{g.source === 'tiktokAds' ? 'TikTok Ads API' : 'TikTok Organic API'}</span>
              <b style={{ color: pct >= 100 ? '#ef4444' : 'var(--text)' }}>{g.used}/{g.limit_per_month} ({pct}%)</b>
            </div>
            <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#ef4444' : '#10b981' }} />
            </div>
          </div>
        })}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Quando a cota chega a 100%, a MM muda automaticamente para descoberta pública gratuita. Esse fallback encontra páginas/URLs, mas não inventa views, CTR ou vendas.</div>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
      <a href="https://www.tiktok.com/search?q=beauty%20product" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: '#111827', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Abrir busca pública TikTok ↗</a>
      <a href="https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=30&region=US" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: '#111827', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Abrir Creative Center US ↗</a>
    </div>

    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>Últimos sinais gravados</div>
      {signals.length === 0 ? <div style={{ padding: 20, color: 'var(--text3)' }}>Nenhum sinal encontrado.</div> : signals.map((s, i) => <div key={`${s.source_name}-${i}`} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title || s.source_name}</div>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginTop: 3 }}>{s.source_name} · {fmtDate(s.observed_at)}</div>
        </div>
        {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: '#f472b6', fontSize: 11, flexShrink: 0 }}>Abrir ↗</a>}
      </div>)}
    </div>
  </div>
}

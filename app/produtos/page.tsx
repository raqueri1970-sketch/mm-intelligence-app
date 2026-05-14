'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function Ring({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = (Math.min(score, 100) / 100) * circ
  const color = score >= 80 ? '#f59e0b' : score >= 65 ? '#10b981' : score >= 45 ? '#fcd34d' : '#6b7280'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={fill + ' ' + circ} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 11, fontWeight: 800, color, fontFamily: 'var(--mono)' }}>
        {score}
      </span>
    </div>
  )
}

function TimingBadge({ t }: { t: string }) {
  const key = (t || '').replace(/ .*/g, '') || 'AMARELO'
  const map: Record<string,string> = { OURO: '🥇 OURO', VERDE: '✅ VERDE', AMARELO: '⚠ AMARELO', VERMELHO: '❌' }
  return <span className={'mm-timing mm-timing--' + key}>{map[key] || t}</span>
}

const EMOJI: Record<string,string> = {
  Eyes: '👁', Pain: '💊', Skin: '✨', Hair: '💆', Nails: '💅', Sleep: '😴', default: '🌿'
}

// Link Meta Ads CORRETO: por anunciante (page_id), não por produto
function metaLink(p: any): string {
  if (p.advertiser_page_id) {
    // Link direto para TODOS os anúncios desse anunciante específico
    return `https://www.facebook.com/ads/library/?view_all_page_id=${p.advertiser_page_id}&active_status=active&ad_type=all&country=US&media_type=video`
  }
  if (p.ad_library_url) return p.ad_library_url
  // Fallback: busca por keyword + filtro 30 dias mínimo
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(p.name)}&search_type=keyword_unordered&media_type=video`
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [niche, setNiche] = useState('all')

  useEffect(() => {
    supabase.from('ranking_view').select('*')
      .order('score_final', { ascending: false })
      .then(({ data }) => { if (data) setProducts(data); setLoading(false) })
  }, [])

  const niches = ['all', ...Array.from(new Set(products.map(p => p.niche).filter(Boolean)))]

  const filtered = products.filter(p => {
    const ms = !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
               p.name_es?.toLowerCase().includes(search.toLowerCase())
    const timing = (p.timing || '').replace(/ .*/g, '')
    const mf =
      filter === 'all'     ? true :
      filter === 'ouro'    ? timing === 'OURO' :
      filter === 'verde'   ? timing === 'VERDE' :
      filter === 'winner'  ? p.status === 'winner' :
      filter === 'testing' ? p.status === 'testing' :
      filter === 'mx'      ? p.mx_compatible : true
    const mn = niche === 'all' || p.niche === niche
    return ms && mf && mn
  })

  if (loading) return <div className="mm-loading"><div className="mm-spinner" />Carregando produtos...</div>

  return (
    <div className="mm-fade-in">
      <div className="mm-page-header">
        <h1 className="mm-page-title">Produtos Minerados</h1>
        <p className="mm-page-subtitle">{products.length} produtos · Saúde & Beleza · USA referência</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="mm-search" placeholder="🔍 Buscar produto..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="mm-filters" style={{ margin: 0 }}>
          {[['all','Todos'],['ouro','🥇 Ouro'],['verde','✅ Verde'],['winner','🏆 Winner'],['testing','🔬 Testing'],['mx','🇲🇽 MX']].map(([k,v]) => (
            <button key={k} className={'mm-filter-btn' + (filter===k?' mm-filter-btn--active':'')}
              onClick={() => setFilter(k)}>{v}</button>
          ))}
        </div>
        <select className="mm-search" style={{ width: 150 }} value={niche} onChange={e => setNiche(e.target.value)}>
          {niches.map(n => <option key={n} value={n}>{n==='all'?'Todos os nichos':n}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['Total',     products.length,                                           '#a78bfa'],
          ['Ouro',      products.filter(p=>p.timing?.includes('OURO')).length,     '#fbbf24'],
          ['Verde',     products.filter(p=>p.timing?.includes('VERDE')).length,    '#34d399'],
          ['Winner',    products.filter(p=>p.status==='winner').length,            '#34d399'],
          ['Testing',   products.filter(p=>p.status==='testing').length,           '#fbbf24'],
          ['Mostrando', filtered.length,                                           '#c084fc'],
        ].map(([l, v, c]) => (
          <div key={l as string} style={{ background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 14px', textAlign: 'center', minWidth: 72 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: c as string, fontFamily: 'var(--mono)', lineHeight: 1.1 }}>{v}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="mm-card">
        <div className="mm-table-wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>Score</th>
                <th>Timing</th>
                <th>Nicho</th>
                <th>Fonte</th>
                <th title="Quantidade de anúncios do ANUNCIANTE (não do produto)">Ads</th>
                <th>CPA</th>
                <th>Margem</th>
                <th>Janela MX</th>
                <th>Status</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                  Nenhum produto encontrado
                </td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', width: 30 }}>
                    {String(i+1).padStart(2,'0')}
                  </td>
                  <td style={{ minWidth: 200 }}>
                    <Link href={'/produtos/' + p.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg3)',
                        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {EMOJI[p.niche] || EMOJI.default}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{p.name_es}</div>
                        {p.advertiser_name && (
                          <div style={{ fontSize: 10, color: 'var(--purple3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                            📣 {p.advertiser_name}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td><Ring score={Math.round(p.score_final || 0)} /></td>
                  <td><TimingBadge t={p.timing} /></td>
                  <td><span className="mm-niche">{p.niche}</span></td>
                  <td><span className={'mm-source mm-source--' + p.source}>{p.source}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
                        color: (p.n_ads||0) >= 30 ? '#34d399' : 'var(--text3)' }}>
                        {p.n_ads || '—'}
                      </span>
                      {p.advertiser_page_id && (
                        <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                          anunciante
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: '#34d399', fontWeight: 700 }}>
                    {p.cpa_ideal ? '$' + p.cpa_ideal : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>
                    {p.margin_pct ? p.margin_pct.toFixed(1) + '%' : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13,
                    color: p.window_mx_days && p.window_mx_days <= 30 ? '#f59e0b' : 'var(--text2)',
                    fontWeight: p.window_mx_days && p.window_mx_days <= 30 ? 700 : 500 }}>
                    {p.window_mx_days ? p.window_mx_days + 'd' : '—'}
                  </td>
                  <td><span className={'mm-status mm-status--' + p.status}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* META ADS — link por anunciante se tiver page_id, senão por keyword */}
                      <a title={p.advertiser_page_id ? 'Meta Ads · ' + (p.advertiser_name||'Anunciante') + ' · ' + (p.n_ads||0) + ' anúncios' : 'Meta Ads Library'}
                        href={metaLink(p)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: p.advertiser_page_id ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.08)',
                          border: p.advertiser_page_id ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(59,130,246,0.2)',
                          borderRadius: 6, color: '#60a5fa', fontSize: 11, textDecoration: 'none',
                          fontWeight: 700, flexShrink: 0 }}>
                        {p.advertiser_page_id ? 'f✓' : 'f'}
                      </a>
                      <a title="CJ Dropshipping"
                        href={'https://cjdropshipping.com/search.html?searchKey=' + encodeURIComponent(p.name)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                          borderRadius: 6, color: '#fbbf24', fontSize: 11, textDecoration: 'none',
                          fontWeight: 700, flexShrink: 0 }}>CJ</a>
                      <a title="AliExpress · mais vendidos"
                        href={'https://www.aliexpress.com/wholesale?SearchText=' + encodeURIComponent(p.name) + '&SortType=total_tranpro_desc'}
                        target="_blank" rel="noopener noreferrer"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 6, color: '#f87171', fontSize: 11, textDecoration: 'none',
                          fontWeight: 700, flexShrink: 0 }}>Ali</a>
                      <a title="TikTok · vídeos virais"
                        href={'https://www.tiktok.com/search?q=' + encodeURIComponent(p.name) + '&type=video'}
                        target="_blank" rel="noopener noreferrer"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)',
                          borderRadius: 6, color: '#f472b6', fontSize: 11, textDecoration: 'none',
                          fontWeight: 700, flexShrink: 0 }}>TT</a>
                      <Link title="Score MM · IA · Detalhes completos"
                        href={'/produtos/' + p.id}
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)',
                          borderRadius: 6, color: '#c084fc', fontSize: 10, textDecoration: 'none',
                          fontWeight: 800, flexShrink: 0 }}>MM</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ marginTop: 12, padding: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 8, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Links:</span>
        <span style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'var(--mono)' }}>f✓ = Meta Ads por anunciante (30+ ads)</span>
        <span style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'var(--mono)' }}>f = Meta Ads por keyword</span>
        <span style={{ fontSize: 11, color: '#fbbf24', fontFamily: 'var(--mono)' }}>CJ = CJ Dropshipping</span>
        <span style={{ fontSize: 11, color: '#f87171', fontFamily: 'var(--mono)' }}>Ali = AliExpress mais vendidos</span>
        <span style={{ fontSize: 11, color: '#f472b6', fontFamily: 'var(--mono)' }}>TT = TikTok vídeos</span>
        <span style={{ fontSize: 11, color: '#c084fc', fontFamily: 'var(--mono)' }}>MM = Score completo + IA</span>
      </div>
    </div>
  )
}

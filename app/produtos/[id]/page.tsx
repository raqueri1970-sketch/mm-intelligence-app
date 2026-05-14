'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'

const MM_LABELS = [
  'Demanda','Valor','Margem','CPA','Viral','TikTok',
  'Facebook','Trends','Concorrencia','Logistica','Risco',
  'Global','Criativos','LP'
]

function Ring({ score, size }: { score: number; size?: number }) {
  const s = size || 64
  const r = (s - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = (Math.min(score, 100) / 100) * circ
  const color = score >= 80 ? '#f59e0b' : score >= 65 ? '#10b981' : score >= 45 ? '#fcd34d' : '#ef4444'
  return (
    <div className="mm-score-ring" style={{ width: s, height: s }}>
      <svg width={s} height={s} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={fill + ' ' + circ} strokeLinecap="round" />
      </svg>
      <span className="mm-score-ring__val" style={{ color, fontSize: s > 60 ? 18 : 12, fontWeight: 800 }}>{score}</span>
    </div>
  )
}

export default function ProdutoPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params?.id) return
    supabase
      .from('ranking_view')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data }) => {
        setProduct(data)
        setLoading(false)
      })
  }, [params?.id])

  if (loading) return <div className="mm-loading"><div className="mm-spinner" />Carregando produto...</div>
  if (!product) return <div className="mm-loading">Produto nao encontrado</div>

  const timing = (product.timing || '').replace(/ .*/g, '') || 'AMARELO'
  const timingLabels: Record<string,string> = { OURO:'🥇 OURO', VERDE:'✅ VERDE', AMARELO:'⚠ AMARELO', VERMELHO:'❌ VERMELHO' }

  return (
    <div className="mm-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()}
          className="mm-btn mm-btn--outline mm-btn--sm">
          ← Voltar
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{product.name}</h1>
          <p style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{product.name_es}</p>
        </div>
      </div>

      <div className="mm-grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Coluna esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Score card */}
          <div className="mm-card">
            <div className="mm-card__body">
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
                <Ring score={Math.round(product.score_final || 0)} size={80} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span className={'mm-timing mm-timing--' + timing} style={{ fontSize: 13, padding: '5px 14px' }}>
                      {timingLabels[timing] || product.timing}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
                    MM Score: <strong style={{ color: 'var(--purple3)' }}>{Math.round(product.mm_pct || 0)}%</strong>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                    {product.n_ads || 0} anuncios · {product.engagement ? (product.engagement/1000).toFixed(1) + 'k eng' : '—'}
                  </div>
                </div>
                <span className={'mm-status mm-status--' + product.status} style={{ alignSelf: 'flex-start', fontSize: 12, padding: '5px 12px' }}>
                  {product.status}
                </span>
              </div>

              {/* Financeiro */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Preco de Venda', product.price ? '$' + product.price : '—', '#f8f6ff'],
                  ['CPA Ideal',      product.cpa_ideal ? '$' + product.cpa_ideal : '—', '#34d399'],
                  ['CPA Maximo',     product.cpa_max ? '$' + product.cpa_max : '—', '#fbbf24'],
                  ['Margem Liquida', product.margin_pct ? product.margin_pct.toFixed(1) + '%' : '—', '#a78bfa'],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: c as string }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Janelas */}
          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Janela de Oportunidade</span></div>
            <div className="mm-card__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['🇺🇸 USA',    product.window_us_days],
                  ['🇲🇽 Mexico', product.window_mx_days],
                ].map(([l, v]) => (
                  <div key={l as string} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '14px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--mono)',
                      color: v && (v as number) <= 30 ? '#f59e0b' : 'var(--text)' }}>
                      {v ? v + 'd' : '—'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                      {v && (v as number) <= 30 ? 'URGENTE' : v ? 'disponivel' : 'sem dados'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* IA */}
          {product.ai_summary && (
            <div className="mm-card">
              <div className="mm-card__header"><span className="mm-card__title">IA Analista</span></div>
              <div className="mm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, border: '1px solid var(--border)' }}>
                  {product.ai_summary}
                </div>
                {product.ai_recommendation && (
                  <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 13, color: '#34d399', lineHeight: 1.6 }}>
                    <strong>Recomendacao:</strong> {product.ai_recommendation}
                  </div>
                )}
                {product.ai_hook_en && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Hook EN</div>
                    <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', fontStyle: 'italic' }}>
                      "{product.ai_hook_en}"
                    </div>
                  </div>
                )}
                {product.ai_hook_es && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Hook ES</div>
                    <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', fontStyle: 'italic' }}>
                      "{product.ai_hook_es}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Links */}
          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Links de Pesquisa</span></div>
            <div className="mm-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=' + encodeURIComponent(product.name) + '&search_type=keyword_unordered&media_type=video'}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#60a5fa', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 18 }}>📣</span>
                <div>
                  <div>Meta Ads Library</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.7, marginTop: 2 }}>Videos ativos · filtrado por {product.name}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10 }}>↗</span>
              </a>

              <a href={'https://cjdropshipping.com/search.html?searchKey=' + encodeURIComponent(product.name)}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, color: '#fbbf24', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 18 }}>📦</span>
                <div>
                  <div>CJ Dropshipping</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.7, marginTop: 2 }}>Fornecedor · preco e estoque</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10 }}>↗</span>
              </a>

              <a href={'https://www.aliexpress.com/wholesale?SearchText=' + encodeURIComponent(product.name) + '&SortType=total_tranpro_desc'}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 18 }}>🛒</span>
                <div>
                  <div>AliExpress</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.7, marginTop: 2 }}>Ordenado por mais vendidos</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10 }}>↗</span>
              </a>

              <a href={'https://www.tiktok.com/search?q=' + encodeURIComponent(product.name) + '&type=video'}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 10, color: '#f472b6', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 18 }}>▶</span>
                <div>
                  <div>TikTok Videos</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.7, marginTop: 2 }}>Virais organicos do produto</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10 }}>↗</span>
              </a>

              <a href={'https://www.google.com/search?q=' + encodeURIComponent(product.name + ' dropshipping store') + '&tbm=shop'}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: '#34d399', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
                <span style={{ fontSize: 18 }}>🏪</span>
                <div>
                  <div>Lojas Concorrentes</div>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.7, marginTop: 2 }}>Google Shopping · concorrentes</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 10 }}>↗</span>
              </a>

              {product.store_url && (
                <a href={product.store_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, color: '#a78bfa', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 18 }}>🔗</span>
                  <div>
                    <div>Loja Detectada</div>
                    <div style={{ fontSize: 10, fontFamily: 'var(--mono)', opacity: 0.7, marginTop: 2 }}>Loja rival especifica</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 10 }}>↗</span>
                </a>
              )}
            </div>
          </div>

          {/* MM 14 criterios */}
          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Mapa Mestre — 14 Criterios</span></div>
            <div className="mm-card__body">
              {MM_LABELS.map((label, i) => {
                const key = 'mm_' + String(i + 1).padStart(2, '0')
                const val = Number(product[key] || 0)
                return (
                  <div key={label} className="mm-bar-row" style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)', width: 100, flexShrink: 0, fontFamily: 'var(--mono)' }}>{label}</span>
                    <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: (val / 10 * 100) + '%', height: '100%', borderRadius: 3,
                        background: val >= 8 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : val >= 6 ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.2)',
                        transition: 'width 0.7s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, color: val >= 8 ? '#fbbf24' : val >= 6 ? '#a78bfa' : 'var(--text3)', width: 20, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{val}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

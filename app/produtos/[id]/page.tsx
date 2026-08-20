'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useParams, useRouter } from 'next/navigation'

const MM_LABELS = [
  'Demanda','Valor','Margem','CPA','Viral','TikTok',
  'Facebook','Trends','Concorrencia','Logistica','Risco',
  'Global','Criativos','LP'
]

function Ring({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = (Math.min(score, 100) / 100) * circ
  const color = score >= 80 ? '#f59e0b' : score >= 65 ? '#10b981' : score >= 45 ? '#fcd34d' : '#ef4444'
  return (
    <div className="mm-score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={fill + ' ' + circ} strokeLinecap="round" />
      </svg>
      <span className="mm-score-ring__val" style={{ color, fontSize: size > 60 ? 18 : 12, fontWeight: 800 }}>{score}</span>
    </div>
  )
}

function ResearchLink({ href, icon, title, note, color }:{ href:string; icon:string; title:string; note:string; color:string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text2)', textDecoration:'none' }}>
      <span style={{fontSize:17}}>{icon}</span>
      <div style={{minWidth:0}}>
        <div style={{fontSize:12,fontWeight:700,color}}>{title}</div>
        <div style={{fontSize:9,fontFamily:'var(--mono)',color:'var(--text3)',marginTop:2}}>{note}</div>
      </div>
      <span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)'}}>↗</span>
    </a>
  )
}

export default function ProdutoPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params?.id) return
    supabase.from('ranking_view').select('*').eq('id', params.id).single().then(({ data }) => {
      setProduct(data)
      setLoading(false)
    })
  }, [params?.id])

  if (loading) return <div className="mm-loading"><div className="mm-spinner" />Carregando produto...</div>
  if (!product) return <div className="mm-loading">Produto não encontrado</div>

  const timing = (product.timing || '').replace(/ .*/g, '') || 'AMARELO'
  const timingLabels: Record<string,string> = { OURO:'🥇 OURO', VERDE:'✅ VERDE', AMARELO:'⚠ AMARELO', VERMELHO:'❌ VERMELHO' }
  const hasExactLink = Boolean(product.store_url)
  const hasImage = Boolean(product.image_url)
  const verifiedAt = product.asset_verified_at ? new Date(product.asset_verified_at).toLocaleString('pt-BR') : null

  return (
    <div className="mm-fade-in">
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
        <button onClick={() => router.back()} className="mm-btn mm-btn--outline mm-btn--sm">← Voltar</button>
        <div style={{minWidth:0}}>
          <h1 style={{fontSize:22,fontWeight:800,letterSpacing:-.5,margin:0}}>{product.name}</h1>
          <p style={{fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)',margin:'4px 0 0'}}>
            {hasExactLink ? 'ITEM REAL VALIDADO' : 'ITEM EM VALIDAÇÃO'} · {product.asset_source || product.source || 'MM'}
          </p>
        </div>
      </div>

      <div className="mm-grid-2" style={{gap:20,marginBottom:20}}>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="mm-card">
            <div className="mm-card__body">
              <div style={{display:'grid',gridTemplateColumns:'minmax(180px,260px) 1fr',gap:18,alignItems:'stretch'}}>
                <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,minHeight:240,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                  {hasImage ? (
                    <img src={product.image_url} alt={product.name}
                      style={{width:'100%',height:260,objectFit:'contain',background:'#fff'}} />
                  ) : (
                    <div style={{padding:24,textAlign:'center'}}>
                      <div style={{fontSize:42,marginBottom:10}}>📦</div>
                      <div style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>Foto ainda não confirmada</div>
                      <div style={{fontSize:10,color:'var(--text3)',marginTop:5,lineHeight:1.5}}>O MM não usa imagem parecida só para preencher.</div>
                    </div>
                  )}
                </div>

                <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',gap:14}}>
                  <div style={{display:'flex',gap:16,alignItems:'center'}}>
                    <Ring score={Math.round(product.score_final || 0)} size={82} />
                    <div style={{flex:1}}>
                      <span className={'mm-timing mm-timing--'+timing} style={{fontSize:13,padding:'5px 14px'}}>{timingLabels[timing] || product.timing}</span>
                      <div style={{fontSize:13,color:'var(--text2)',marginTop:10}}>
                        Score real: <strong style={{color:'var(--purple3)'}}>{Math.round(product.score_final || 0)}</strong>
                      </div>
                      <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:5}}>
                        Qualidade {product.data_quality_pct ?? '—'}% · {product.sources_count ?? '—'} fonte(s)
                      </div>
                      {product.final_decision && <div style={{fontSize:10,color:'#fbbf24',fontFamily:'var(--mono)',marginTop:4}}>Conselho: {product.final_decision}</div>}
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9}}>
                    {[
                      ['Preço de Venda', product.price ? '$'+product.price : '—', '#f8f6ff'],
                      ['CPA Ideal', product.cpa_ideal ? '$'+product.cpa_ideal : '—', '#34d399'],
                      ['CPA Máximo', product.cpa_max ? '$'+product.cpa_max : '—', '#fbbf24'],
                      ['Margem Líquida', product.margin_pct ? Number(product.margin_pct).toFixed(1)+'%' : '—', '#a78bfa'],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{background:'var(--bg3)',borderRadius:9,padding:'11px 12px',border:'1px solid var(--border)'}}>
                        <div style={{fontSize:9,color:'var(--text3)',fontFamily:'var(--mono)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>{l}</div>
                        <div style={{fontSize:18,fontWeight:800,fontFamily:'var(--mono)',color:c as string}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Janela de Oportunidade</span></div>
            <div className="mm-card__body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {[['🇺🇸 USA',product.window_us_days],['🇲🇽 México',product.window_mx_days]].map(([l,v]) => (
                  <div key={l as string} style={{background:'var(--bg3)',borderRadius:10,padding:14,textAlign:'center',border:'1px solid var(--border)'}}>
                    <div style={{fontSize:12,color:'var(--text3)',marginBottom:6}}>{l}</div>
                    <div style={{fontSize:27,fontWeight:800,fontFamily:'var(--mono)',color:v && Number(v)<=30?'#f59e0b':'var(--text)'}}>{v ? v+'d' : '—'}</div>
                    <div style={{fontSize:9,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:4}}>{v ? 'dados do MM' : 'sem dados'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {product.ai_summary && (
            <div className="mm-card">
              <div className="mm-card__header"><span className="mm-card__title">IA Analista</span></div>
              <div className="mm-card__body">
                <div style={{padding:'12px 14px',background:'var(--bg3)',borderRadius:10,fontSize:13,color:'var(--text2)',lineHeight:1.7,border:'1px solid var(--border)'}}>{product.ai_summary}</div>
                {product.ai_recommendation && <div style={{marginTop:10,padding:'12px 14px',background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.2)',borderRadius:10,fontSize:13,color:'#34d399'}}><strong>Recomendação:</strong> {product.ai_recommendation}</div>}
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Produto validado</span></div>
            <div className="mm-card__body">
              {hasExactLink ? (
                <>
                  <div style={{padding:'11px 13px',background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.25)',borderRadius:9,marginBottom:10}}>
                    <div style={{fontSize:11,fontWeight:800,color:'#34d399'}}>✓ LINK EXATO CONFIRMADO</div>
                    <div style={{fontSize:9,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:4,wordBreak:'break-word'}}>{product.asset_source || 'Fonte validada pelo MM'}</div>
                    {verifiedAt && <div style={{fontSize:9,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:3}}>verificado em {verifiedAt}</div>}
                  </div>
                  <a href={product.store_url} target="_blank" rel="noopener noreferrer"
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px 14px',background:'var(--purple)',borderRadius:10,color:'#fff',fontWeight:800,textDecoration:'none',fontSize:13}}>
                    🔗 Abrir produto real ↗
                  </a>
                </>
              ) : (
                <div style={{padding:16,background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.22)',borderRadius:9}}>
                  <div style={{fontSize:12,fontWeight:800,color:'#fbbf24'}}>Link do item ainda não validado</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:5,lineHeight:1.5}}>Pesquisas auxiliares não serão mostradas como se fossem o link do produto.</div>
                </div>
              )}
            </div>
          </div>

          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Pesquisa auxiliar</span></div>
            <div className="mm-card__body" style={{display:'flex',flexDirection:'column',gap:7}}>
              <div style={{fontSize:10,color:'var(--text3)',lineHeight:1.5,marginBottom:2}}>
                Estes links são apenas pesquisa pelo nome. <strong style={{color:'var(--text2)'}}>Não são o link do produto.</strong>
              </div>
              <ResearchLink
                href={'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q='+encodeURIComponent(product.name)+'&search_type=keyword_unordered&media_type=video'}
                icon="📣" title="Meta Ads — pesquisa" note="Busca auxiliar, correspondência não garantida" color="#60a5fa" />
              <ResearchLink
                href={'https://www.tiktok.com/search?q='+encodeURIComponent(product.name)+'&type=video'}
                icon="▶" title="TikTok — pesquisa" note="Busca auxiliar por vídeos" color="#f472b6" />
            </div>
          </div>

          <div className="mm-card">
            <div className="mm-card__header"><span className="mm-card__title">Mapa Mestre — 14 Critérios</span></div>
            <div className="mm-card__body">
              {MM_LABELS.map((label,i) => {
                const key='mm_'+String(i+1).padStart(2,'0')
                const val=Number(product[key]||0)
                return (
                  <div key={label} className="mm-bar-row" style={{marginBottom:8}}>
                    <span style={{fontSize:12,color:'var(--text2)',width:100,flexShrink:0,fontFamily:'var(--mono)'}}>{label}</span>
                    <div style={{flex:1,height:5,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:(val/10*100)+'%',height:'100%',borderRadius:3,background:val>=8?'linear-gradient(90deg,#f59e0b,#fbbf24)':val>=6?'linear-gradient(90deg,#7c3aed,#a855f7)':'rgba(255,255,255,.2)'}} />
                    </div>
                    <span style={{fontSize:12,color:val>=8?'#fbbf24':val>=6?'#a78bfa':'var(--text3)',width:20,textAlign:'right',fontFamily:'var(--mono)',fontWeight:700}}>{val}</span>
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

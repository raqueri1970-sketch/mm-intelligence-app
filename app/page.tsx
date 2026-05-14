'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

function Ring({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const fill = (Math.min(score, 100) / 100) * circ
  const color = score >= 80 ? '#f59e0b' : score >= 65 ? '#10b981' : score >= 45 ? '#fcd34d' : '#ef4444'
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={fill + ' ' + circ} strokeLinecap="round"/>
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        justifyContent:'center', fontSize: size > 40 ? 13 : 11, fontWeight:800,
        color, fontFamily:'var(--mono)', letterSpacing:'-0.5px' }}>{score}</span>
    </div>
  )
}

function TimingBadge({ t }: { t: string }) {
  const key = (t||'').replace(/ .*/g,'') || 'AMARELO'
  const cfg: Record<string,{label:string,bg:string,color:string}> = {
    OURO:    { label:'🥇 OURO',    bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
    VERDE:   { label:'✅ VERDE',   bg:'rgba(16,185,129,0.12)', color:'#10b981' },
    AMARELO: { label:'⚠ AMARELO', bg:'rgba(252,211,77,0.10)', color:'#fcd34d' },
    VERMELHO:{ label:'❌ VERM.',   bg:'rgba(239,68,68,0.10)',  color:'#ef4444' },
  }
  const c = cfg[key] || cfg.AMARELO
  return (
    <span style={{ background:c.bg, color:c.color, border:`1px solid ${c.color}30`,
      borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700,
      fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>{c.label}</span>
  )
}

function StatusBadge({ s }: { s: string }) {
  const cfg: Record<string,{bg:string,color:string}> = {
    winner:  { bg:'rgba(16,185,129,0.15)', color:'#10b981' },
    testing: { bg:'rgba(245,158,11,0.12)', color:'#f59e0b' },
    new:     { bg:'rgba(139,92,246,0.12)', color:'#a78bfa' },
  }
  const c = cfg[s] || { bg:'rgba(107,114,128,0.12)', color:'#9ca3af' }
  return (
    <span style={{ background:c.bg, color:c.color, border:`1px solid ${c.color}30`,
      borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:600,
      textTransform:'uppercase', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>{s||'—'}</span>
  )
}

const NICHO_EMOJI: Record<string,string> = {
  Eyes:'👁', Pain:'💊', Skin:'✨', Hair:'💆', Nails:'💅', Sleep:'😴',
  Beauty:'💄', Posture:'🦾', Massage:'💆', default:'🌿'
}

function metaLink(p: any): string {
  if (p.advertiser_page_id) {
    return `https://www.facebook.com/ads/library/?view_all_page_id=${p.advertiser_page_id}&active_status=active&ad_type=all&country=US&media_type=video`
  }
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(p.name)}&search_type=keyword_unordered&media_type=video`
}

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([])
  const [alerts, setAlerts]     = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [now, setNow]           = useState('')

  useEffect(() => {
    const d = new Date()
    setNow(d.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }))
    Promise.all([
      supabase.from('ranking_view').select('*').limit(20),
      supabase.from('alerts').select('*').order('created_at',{ ascending:false }).limit(5),
    ]).then(([{ data:p },{ data:a }]) => {
      if (p) setProducts(p)
      if (a) setAlerts(a)
      setLoading(false)
    })
  }, [])

  const filtered = products.filter(p => {
    if (filter==='ouro')   return p.timing?.includes('OURO')
    if (filter==='verde')  return p.timing?.includes('VERDE')
    if (filter==='winner') return p.status==='winner'
    if (filter==='mx')     return p.mx_compatible
    return true
  })

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'60vh', gap:12, color:'var(--text3)', fontFamily:'var(--mono)', fontSize:13 }}>
      <div style={{ width:18, height:18, borderRadius:'50%', border:'2px solid var(--purple3)',
        borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      Carregando dados...
    </div>
  )

  const gold    = products.filter(p=>p.timing?.includes('OURO')).length
  const green   = products.filter(p=>p.timing?.includes('VERDE')).length
  const winners = products.filter(p=>p.status==='winner').length
  const avg     = products.length ? Math.round(products.reduce((s,p)=>s+(p.score_final||0),0)/products.length) : 0
  const highAds = products.filter(p=>(p.n_ads||0)>=40).length

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', margin:0,
              fontFamily:'var(--font)' }}>MM Intelligence</h1>
            <p style={{ fontSize:12, color:'var(--text3)', margin:'4px 0 0', fontFamily:'var(--mono)' }}>
              Score MM · IA Analista · Timing de Entrada
            </p>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'capitalize' }}>
            {now}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:20 }}>
        {[
          { label:'Total Produtos', val:products.length, color:'#a78bfa' },
          { label:'Timing Ouro',    val:gold,            color:'#f59e0b' },
          { label:'Timing Verde',   val:green,           color:'#10b981' },
          { label:'Vencedores',     val:winners,         color:'#34d399' },
          { label:'Score Médio',    val:avg,             color:'#60a5fa' },
          { label:'40+ Anúncios',   val:highAds,         color:'#c084fc' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:10, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:900, color, fontFamily:'var(--mono)',
              lineHeight:1, letterSpacing:'-1px' }}>{val}</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:5, fontFamily:'var(--mono)',
              textTransform:'uppercase', letterSpacing:'0.8px', lineHeight:1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabela principal */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, marginBottom:16, overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', fontFamily:'var(--font)' }}>
            Ranking de Produtos
          </span>
          <Link href="/produtos" style={{ fontSize:11, color:'var(--purple3)', fontFamily:'var(--mono)',
            textDecoration:'none', border:'1px solid var(--purple3)', borderRadius:6,
            padding:'4px 10px', transition:'all 0.15s' }}>
            Ver todos →
          </Link>
        </div>

        {/* Filtros */}
        <div style={{ display:'flex', gap:6, padding:'12px 20px', borderBottom:'1px solid var(--border)',
          flexWrap:'wrap' }}>
          {[['all','Todos'],['ouro','🥇 Ouro'],['verde','✅ Verde'],['winner','🏆 Winner'],['mx','🇲🇽 MX']].map(([k,v]) => (
            <button key={k} onClick={()=>setFilter(k)} style={{
              background: filter===k ? 'var(--purple)' : 'transparent',
              color: filter===k ? '#fff' : 'var(--text3)',
              border: filter===k ? '1px solid var(--purple)' : '1px solid var(--border)',
              borderRadius:6, padding:'5px 12px', fontSize:11, fontFamily:'var(--mono)',
              cursor:'pointer', fontWeight:filter===k?700:400, transition:'all 0.15s' }}>
              {v}
            </button>
          ))}
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['#','Produto','Score','Timing','Nicho','Fonte','Ads','CPA','Margem','Status','Links'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10,
                    color:'var(--text3)', fontFamily:'var(--mono)', textTransform:'uppercase',
                    letterSpacing:'0.8px', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:40, color:'var(--text3)',
                  fontFamily:'var(--mono)', fontSize:12 }}>Nenhum produto encontrado</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom:'1px solid var(--border)',
                  transition:'background 0.1s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.02)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                  <td style={{ padding:'10px 12px', fontFamily:'var(--mono)', fontSize:11,
                    color:'var(--text3)', width:30 }}>{String(i+1).padStart(2,'0')}</td>
                  <td style={{ padding:'10px 12px', minWidth:220 }}>
                    <Link href={'/produtos/'+p.id} style={{ display:'flex', alignItems:'center',
                      gap:10, textDecoration:'none' }}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} style={{ width:36, height:36,
                          borderRadius:8, objectFit:'cover', border:'1px solid var(--border)',
                          flexShrink:0 }}/>
                      ) : (
                        <div style={{ width:36, height:36, borderRadius:8, background:'var(--bg3)',
                          border:'1px solid var(--border)', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:16, flexShrink:0 }}>
                          {NICHO_EMOJI[p.niche]||NICHO_EMOJI.default}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight:700, color:'var(--text)', fontSize:13 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{p.name_es}</div>
                        {p.advertiser_name && (
                          <div style={{ fontSize:10, color:'#7c3aed', fontFamily:'var(--mono)', marginTop:2 }}>
                            📣 {p.advertiser_name}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding:'10px 12px' }}><Ring score={Math.round(p.score_final||0)} size={44}/></td>
                  <td style={{ padding:'10px 12px' }}><TimingBadge t={p.timing}/></td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ background:'rgba(124,58,237,0.1)', color:'#a78bfa',
                      border:'1px solid rgba(124,58,237,0.2)', borderRadius:5,
                      padding:'3px 8px', fontSize:11, fontFamily:'var(--mono)' }}>{p.niche}</span>
                  </td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ fontSize:10, fontFamily:'var(--mono)', fontWeight:700,
                      color: p.source==='META'?'#60a5fa':p.source==='TIKTOK'?'#f472b6':
                        p.source==='AMAZON'?'#fb923c':'#34d399' }}>{p.source}</span>
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'var(--mono)', fontSize:13,
                    fontWeight:700, color:(p.n_ads||0)>=30?'#34d399':'var(--text3)' }}>
                    {p.n_ads||'—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'var(--mono)', fontSize:13,
                    fontWeight:700, color:'#34d399' }}>
                    {p.cpa_ideal?'$'+p.cpa_ideal:'—'}
                  </td>
                  <td style={{ padding:'10px 12px', fontFamily:'var(--mono)', fontSize:13,
                    fontWeight:600, color:'var(--text2)' }}>
                    {p.margin_pct?p.margin_pct.toFixed(1)+'%':'—'}
                  </td>
                  <td style={{ padding:'10px 12px' }}><StatusBadge s={p.status}/></td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {[
                        { title: p.advertiser_page_id?`Meta · ${p.advertiser_name||'Anunciante'} · ${p.n_ads||0} ads`:'Meta Ads',
                          href: metaLink(p), label: p.advertiser_page_id?'f✓':'f',
                          bg:'rgba(59,130,246,0.15)', color:'#60a5fa', border:'rgba(59,130,246,0.3)' },
                        { title:'CJ Dropshipping', label:'CJ',
                          href:`https://cjdropshipping.com/search.html?searchKey=${encodeURIComponent(p.name)}`,
                          bg:'rgba(245,158,11,0.12)', color:'#fbbf24', border:'rgba(245,158,11,0.3)' },
                        { title:'AliExpress mais vendidos', label:'Ali',
                          href:`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(p.name)}&SortType=total_tranpro_desc`,
                          bg:'rgba(239,68,68,0.12)', color:'#f87171', border:'rgba(239,68,68,0.3)' },
                        { title:'TikTok vídeos virais', label:'TT',
                          href:`https://www.tiktok.com/search?q=${encodeURIComponent(p.name)}&type=video`,
                          bg:'rgba(236,72,153,0.12)', color:'#f472b6', border:'rgba(236,72,153,0.3)' },
                      ].map(({ title, href, label, bg, color, border }) => (
                        <a key={label} title={title} href={href} target="_blank" rel="noopener noreferrer"
                          style={{ width:28, height:28, display:'flex', alignItems:'center',
                            justifyContent:'center', background:bg, border:`1px solid ${border}`,
                            borderRadius:6, color, fontSize:10, textDecoration:'none',
                            fontWeight:800, flexShrink:0, transition:'opacity 0.15s' }}
                          onMouseEnter={e=>(e.currentTarget.style.opacity='0.7')}
                          onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                          {label}
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Painéis inferiores */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Alertas */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--font)' }}>Alertas</span>
            <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)' }}>
              {alerts.filter(a=>!a.is_read).length} novos
            </span>
          </div>
          <div style={{ padding:'8px 0' }}>
            {alerts.length===0 ? (
              <div style={{ padding:24, textAlign:'center', color:'var(--text3)',
                fontFamily:'var(--mono)', fontSize:12 }}>Nenhum alerta ainda</div>
            ) : alerts.map(a => (
              <div key={a.id} style={{ padding:'10px 18px', borderBottom:'1px solid var(--border)',
                background: !a.is_read ? 'rgba(124,58,237,0.04)' : 'transparent' }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{a.title}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{a.message}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Janelas de oportunidade */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--font)' }}>
              Janelas de Oportunidade
            </span>
          </div>
          <div style={{ padding:'8px 0' }}>
            {products.filter(p=>p.window_mx_days>0)
              .sort((a,b)=>a.window_mx_days-b.window_mx_days)
              .slice(0,5)
              .map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center',
                  justifyContent:'space-between', padding:'10px 18px',
                  borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--mono)', marginTop:2 }}>
                      MX · {p.window_mx_days} dias restantes
                    </div>
                  </div>
                  <TimingBadge t={p.timing}/>
                </div>
              ))}
            {products.filter(p=>p.window_mx_days>0).length===0 && (
              <div style={{ padding:24, textAlign:'center', color:'var(--text3)',
                fontFamily:'var(--mono)', fontSize:12 }}>
                Rode o minerador para ver janelas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

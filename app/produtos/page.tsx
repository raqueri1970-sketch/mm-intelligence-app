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
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={fill+' '+circ} strokeLinecap="round" />
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color, fontFamily:'var(--mono)' }}>{score}</span>
    </div>
  )
}

function TimingBadge({ t }: { t:string }) {
  const key=(t||'').replace(/ .*/g,'')||'AMARELO'
  const map:Record<string,string>={OURO:'🥇 OURO',VERDE:'✅ VERDE',AMARELO:'⚠ AMARELO',VERMELHO:'❌'}
  return <span className={'mm-timing mm-timing--'+key}>{map[key]||t}</span>
}

function metaLink(p:any):string {
  if(p.advertiser_page_id) return `https://www.facebook.com/ads/library/?view_all_page_id=${p.advertiser_page_id}&active_status=active&ad_type=all&country=US&media_type=video`
  if(p.ad_library_url) return p.ad_library_url
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(p.name)}&search_type=keyword_unordered&media_type=video`
}

export default function ProdutosPage(){
  const [products,setProducts]=useState<any[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [niche,setNiche]=useState('all')
  const [photo,setPhoto]=useState<any|null>(null)

  useEffect(()=>{
    let active=true
    async function loadProducts(){
      const {data}=await supabase.from('ranking_view').select('*').order('score_final',{ascending:false})
      const candidates=(data||[]).filter(p=>p.image_url&&p.store_url&&p.asset_verified_at)
      const validated=await Promise.all(candidates.map(p=>new Promise<any|null>(resolve=>{
        const image=new Image()
        const timer=window.setTimeout(()=>resolve(null),8000)
        image.onload=()=>{window.clearTimeout(timer);resolve(image.naturalWidth>0&&image.naturalHeight>0?p:null)}
        image.onerror=()=>{window.clearTimeout(timer);resolve(null)}
        image.src=p.image_url
      })))
      if(active){setProducts(validated.filter(Boolean));setLoading(false)}
    }
    loadProducts()
    return()=>{active=false}
  },[])

  const niches=['all',...Array.from(new Set(products.map(p=>p.niche).filter(Boolean)))]
  const filtered=products.filter(p=>{
    const ms=!search||p.name?.toLowerCase().includes(search.toLowerCase())||p.name_es?.toLowerCase().includes(search.toLowerCase())
    const timing=(p.timing||'').replace(/ .*/g,'')
    const mf=filter==='all'?true:filter==='ouro'?timing==='OURO':filter==='verde'?timing==='VERDE':filter==='winner'?p.status==='winner':filter==='testing'?p.status==='testing':filter==='mx'?p.mx_compatible:true
    return ms&&mf&&(niche==='all'||p.niche===niche)
  })

  if(loading)return <div className="mm-loading"><div className="mm-spinner"/>Carregando produtos...</div>

  return <div className="mm-fade-in">
    <div className="mm-page-header"><h1 className="mm-page-title">Produtos Minerados</h1><p className="mm-page-subtitle">{products.length} produtos · Saúde & Beleza · USA referência</p></div>
    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
      <input className="mm-search" placeholder="🔍 Buscar produto..." value={search} onChange={e=>setSearch(e.target.value)}/>
      <div className="mm-filters" style={{margin:0}}>{[['all','Todos'],['ouro','🥇 Ouro'],['verde','✅ Verde'],['winner','🏆 Winner'],['testing','🔬 Testing'],['mx','🇲🇽 MX']].map(([k,v])=><button key={k} className={'mm-filter-btn'+(filter===k?' mm-filter-btn--active':'')} onClick={()=>setFilter(k)}>{v}</button>)}</div>
      <select className="mm-search" style={{width:150}} value={niche} onChange={e=>setNiche(e.target.value)}>{niches.map(n=><option key={n} value={n}>{n==='all'?'Todos os nichos':n}</option>)}</select>
    </div>

    <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>{[
      ['Total',products.length,'#a78bfa'],['Ouro',products.filter(p=>p.timing?.includes('OURO')).length,'#fbbf24'],['Verde',products.filter(p=>p.timing?.includes('VERDE')).length,'#34d399'],['Winner',products.filter(p=>p.status==='winner').length,'#34d399'],['Com foto',products.filter(p=>p.image_url).length,'#60a5fa'],['Link real',products.filter(p=>p.store_url).length,'#34d399'],['Mostrando',filtered.length,'#c084fc']
    ].map(([l,v,c])=><div key={l as string} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 14px',textAlign:'center',minWidth:72}}><div style={{fontSize:20,fontWeight:800,color:c as string,fontFamily:'var(--mono)',lineHeight:1.1}}>{v}</div><div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:3,textTransform:'uppercase',letterSpacing:.8}}>{l}</div></div>)}</div>

    <div className="mm-card"><div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>#</th><th>Produto</th><th>Score</th><th>Timing</th><th>Nicho</th><th>Fonte</th><th>Dados</th><th>CPA</th><th>Margem</th><th>Status</th><th>Links</th></tr></thead><tbody>
      {filtered.length===0?<tr><td colSpan={11} style={{textAlign:'center',padding:40,color:'var(--text3)'}}>Nenhum produto encontrado</td></tr>:filtered.map((p,i)=><tr key={p.id}>
        <td style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)',width:30}}>{String(i+1).padStart(2,'0')}</td>
        <td style={{minWidth:250}}>
          <Link href={'/produtos/'+p.id} style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none'}}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} onClick={e=>{e.preventDefault();e.stopPropagation();setPhoto(p)}} title="Clique para ampliar" style={{width:58,height:58,borderRadius:8,objectFit:'contain',background:'#fff',border:'1px solid var(--border)',flexShrink:0,cursor:'zoom-in'}}/>
            ) : (
              <div style={{width:46,height:46,borderRadius:8,background:'var(--bg3)',border:'1px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📦</div>
            )}
            <div>
              <div style={{fontWeight:700,color:'var(--text)',fontSize:13.5}}>{p.name}</div>
              <div style={{fontSize:10,color:p.store_url?'#34d399':'#fbbf24',fontFamily:'var(--mono)',marginTop:3}}>
                {p.store_url?'✓ link real validado':'link do item pendente'} {p.image_url?'· foto real':''}
              </div>
              {p.asset_source&&<div style={{fontSize:9,color:'var(--text3)',fontFamily:'var(--mono)',marginTop:2}}>{p.asset_source}</div>}
            </div>
          </Link>
        </td>
        <td><Link href={'/produtos/'+p.id} title={'Abrir composição do Score '+Math.round(p.score_final||0)} style={{display:'inline-flex',textDecoration:'none',borderRadius:'50%',cursor:'pointer'}}><Ring score={Math.round(p.score_final||0)}/></Link></td>
        <td><TimingBadge t={p.timing}/></td>
        <td><span className="mm-niche">{p.niche}</span></td>
        <td><span className={'mm-source mm-source--'+p.source}>{p.source}</span></td>
        <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{p.data_quality_pct??'—'}% · {p.sources_count??'—'} fonte(s)</td>
        <td style={{fontFamily:'var(--mono)',fontSize:13,color:'#34d399',fontWeight:700}}>{p.cpa_ideal?'$'+p.cpa_ideal:'—'}</td>
        <td style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:600}}>{p.margin_pct?Number(p.margin_pct).toFixed(1)+'%':'—'}</td>
        <td><span className={'mm-status mm-status--'+p.status}>{p.final_decision||p.status}</span></td>
        <td>
          <div style={{display:'flex',gap:4}}>
            {p.store_url&&<a title="Abrir produto real" href={p.store_url} target="_blank" rel="noopener noreferrer" style={{width:30,height:28,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.35)',borderRadius:6,color:'#34d399',fontSize:12,textDecoration:'none',fontWeight:800}}>🔗</a>}
            <Link title="Detalhes MM" href={'/produtos/'+p.id} style={{width:30,height:28,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(124,58,237,.2)',border:'1px solid rgba(124,58,237,.4)',borderRadius:6,color:'#c084fc',fontSize:10,textDecoration:'none',fontWeight:800}}>MM</Link>
            <a title="Meta Ads — apenas pesquisa" href={metaLink(p)} target="_blank" rel="noopener noreferrer" style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:6,color:'#60a5fa',fontSize:10,textDecoration:'none'}}>f</a>
            <a title="TikTok — apenas pesquisa" href={'https://www.tiktok.com/search?q='+encodeURIComponent(p.name)+'&type=video'} target="_blank" rel="noopener noreferrer" style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(236,72,153,.08)',border:'1px solid rgba(236,72,153,.18)',borderRadius:6,color:'#f472b6',fontSize:9,textDecoration:'none'}}>TT</a>
          </div>
        </td>
      </tr>)}
    </tbody></table></div></div>

    {photo&&<div onClick={()=>setPhoto(null)} style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.86)',display:'grid',placeItems:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',width:'min(820px,96vw)',maxHeight:'92vh',background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'0 24px 80px rgba(0,0,0,.55)'}}>
        <button onClick={()=>setPhoto(null)} aria-label="Fechar imagem" style={{position:'absolute',right:10,top:8,zIndex:2,width:36,height:36,borderRadius:'50%',border:'1px solid var(--border)',background:'rgba(10,10,18,.86)',color:'#fff',fontSize:24,cursor:'pointer'}}>×</button>
        <img src={photo.image_url} alt={photo.name} style={{display:'block',width:'100%',height:'min(68vh,680px)',objectFit:'contain',background:'#fff',borderRadius:10}}/>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:12,flexWrap:'wrap'}}>
          <div><div style={{fontWeight:800,fontSize:16,color:'var(--text)'}}>{photo.name}</div><div style={{fontSize:10,color:'#34d399',fontFamily:'var(--mono)',marginTop:3}}>Foto real validada</div></div>
          <a href={photo.store_url} target="_blank" rel="noopener noreferrer" style={{padding:'9px 13px',borderRadius:8,background:'rgba(16,185,129,.14)',border:'1px solid rgba(16,185,129,.4)',color:'#34d399',fontWeight:800,textDecoration:'none',fontSize:11}}>ABRIR ITEM ↗</a>
        </div>
      </div>
    </div>}

    <div style={{marginTop:12,padding:'10px 16px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>
      Foto e link verde são dados do item validado. Meta/TikTok são apenas pesquisas auxiliares e não substituem o link real do produto.
    </div>
  </div>
}

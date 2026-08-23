'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Store = { id:number; domain:string; store_name?:string; market_code?:string; platform?:string; status?:string; growth_score?:number; priority_score?:number; last_seen_at?:string; product_count?:number; price_min?:number; price_max?:number; metadata?:any }
type ProductSignal = { id:number; store_id:number; title?:string; url?:string; score?:number; evidence?:any; observed_at?:string }
type AdSnapshot = { id:string; ad_key:string; store_id?:number; platform:string; advertiser_name:string; product_name?:string; country:string; status_observed:string; snapshot_at:string; source_url:string; landing_page_url?:string; media?:Array<{type?:string;url?:string;identity_validated?:boolean}>; copy?:Record<string,any>; analysis?:Record<string,any>; signals?:Record<string,any>; evidence?:Record<string,any>; decision?:string; decision_reason?:string; image_identity_validated?:boolean }

export default function ConcorrentesPage(){
  const [url,setUrl]=useState('')
  const [market,setMarket]=useState('US')
  const [stores,setStores]=useState<Store[]>([])
  const [products,setProducts]=useState<ProductSignal[]>([])
  const [selected,setSelected]=useState<number|null>(null)
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')
  const [ads,setAds]=useState<AdSnapshot[]>([])
  const [selectedAd,setSelectedAd]=useState<AdSnapshot|null>(null)

  async function load(){
    const { data,error }=await supabase.functions.invoke('mm-dashboard-api',{body:{action:'stores',marketCode:'ALL'}})
    if(error){setMessage('Erro ao carregar lojas: '+error.message);return}
    setStores(data?.stores||[]);setProducts(data?.products||[])
    const {data:adRows,error:adsError}=await supabase.from('mm_ads_dashboard').select('*').order('snapshot_at',{ascending:false}).limit(100)
    if(!adsError)setAds((adRows||[]) as AdSnapshot[])
  }
  useEffect(()=>{load()},[])

  async function addStore(e:React.FormEvent){
    e.preventDefault();if(!url.trim())return
    setLoading(true);setMessage('Analisando a loja e lendo o catálogo público...')
    const rawUrl=url.trim()
    const {data,error}=await supabase.functions.invoke('mm-store-radar',{body:{action:'add_store',url:rawUrl,marketCode:market}})
    if(!error&&data?.ok){
      setMessage(`Loja adicionada. ${data.products_found||0} produtos encontrados. Vendas serão tratadas como estimativa quando não houver dado público.`)
      setUrl('');setSelected(data.store_id||null);await load()
    }else{
      try{
        const normalized=/^https?:\/\//i.test(rawUrl)?rawUrl:`https://${rawUrl}`
        const parsed=new URL(normalized)
        const domain=parsed.hostname.replace(/^www\./,'').toLowerCase()
        const {data:fallback,error:fallbackError}=await supabase.from('mm_store_watchlist').upsert({
          domain,store_name:domain,market_code:market,platform:'Ecommerce',
          discovery_source:'Manual URL',status:'WATCHING',priority_score:50,growth_score:50,
          last_seen_at:new Date().toISOString(),metadata:{url:`${parsed.protocol}//${parsed.host}`,manual:true,pendingCollection:true}
        },{onConflict:'domain,market_code'}).select('id').single()
        if(fallbackError)throw fallbackError
        setMessage('Loja adicionada à vigilância. A leitura do catálogo ficou pendente e será refeita automaticamente.')
        setUrl('');setSelected(fallback?.id||null);await load()
      }catch(fallbackError:any){
        setMessage('Não foi possível adicionar: '+(data?.error||error?.message||fallbackError?.message||'erro desconhecido'))
      }
    }
    setLoading(false)
  }

  const selectedStore=stores.find(s=>s.id===selected)||null
  const storeProducts=useMemo(()=>products.filter(p=>p.store_id===selected),[products,selected])
  const visibleAds=useMemo(()=>selected?ads.filter(a=>a.store_id===selected):ads,[ads,selected])
  const evidence=(ad:AdSnapshot)=>({grade:String(ad.evidence?.grade||'D'),confidence:Number(ad.evidence?.confidence||0)})
  const mediaUrl=(ad:AdSnapshot)=>ad.image_identity_validated?ad.media?.find(m=>m.identity_validated&&/^https?:\/\//i.test(m.url||''))?.url:null

  return <div style={{maxWidth:1180,margin:'0 auto'}}>
    <div style={{marginBottom:22}}>
      <div style={{fontSize:12,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Vigilância competitiva</div>
      <h1 style={{fontSize:28,margin:'5px 0 6px'}}>Lojas Monitoradas</h1>
      <p style={{color:'var(--text2)',margin:0,maxWidth:760}}>Cole somente o link da loja. O MM identifica o catálogo público, registra produtos, preços e mudanças e cria sinais para estimar quais itens estão ganhando força.</p>
    </div>

    <form onSubmit={addStore} className="mm-card" style={{padding:18,marginBottom:20}}>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 100px 160px',gap:10}}>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://loja.com" style={{height:44,border:'1px solid var(--border)',borderRadius:9,background:'var(--bg2)',color:'var(--text1)',padding:'0 13px',fontSize:14}} />
        <select value={market} onChange={e=>setMarket(e.target.value)} style={{height:44,border:'1px solid var(--border)',borderRadius:9,background:'var(--bg2)',color:'var(--text1)',padding:'0 10px'}}><option value="US">🇺🇸 US</option><option value="MX">🇲🇽 MX</option></select>
        <button disabled={loading} style={{height:44,border:0,borderRadius:9,background:'var(--purple)',color:'#fff',fontWeight:800,cursor:loading?'wait':'pointer'}}>{loading?'ANALISANDO...':'ADICIONAR LOJA'}</button>
      </div>
      {message&&<div style={{marginTop:10,fontSize:12,color:'var(--text2)'}}>{message}</div>}
    </form>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12,marginBottom:22}}>
      {stores.map(s=><button key={s.id} onClick={()=>setSelected(s.id)} className="mm-card" style={{textAlign:'left',padding:15,cursor:'pointer',border:selected===s.id?'1px solid var(--purple3)':'1px solid var(--border)',color:'inherit'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><b style={{fontSize:14,overflow:'hidden',textOverflow:'ellipsis'}}>{s.store_name||s.domain}</b><span style={{fontSize:10,color:'var(--green)',fontWeight:800}}>● {s.status||'ATIVA'}</span></div>
        <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{s.domain} · {s.platform||'Ecommerce'} · {s.market_code||'US'}</div>
        <div style={{display:'flex',gap:18,marginTop:13}}><div><div style={{fontSize:9,color:'var(--text3)'}}>PRODUTOS</div><b>{s.product_count||0}</b></div><div><div style={{fontSize:9,color:'var(--text3)'}}>SINAL</div><b>{Math.round(Number(s.growth_score||s.priority_score||0))}</b></div><div><div style={{fontSize:9,color:'var(--text3)'}}>FAIXA</div><b style={{fontSize:12}}>{s.price_min?`$${Number(s.price_min).toFixed(0)}–$${Number(s.price_max||s.price_min).toFixed(0)}`:'—'}</b></div></div>
      </button>)}
    </div>

    <section style={{marginBottom:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',gap:12,marginBottom:12}}>
        <div><h2 style={{fontSize:19,margin:'0 0 4px'}}>Anúncios da concorrência</h2><div style={{fontSize:11,color:'var(--text3)'}}>Fatos, sinais e inferências separados · clique em qualquer card</div></div>
        <div style={{fontSize:11,color:'var(--text3)'}}>{visibleAds.length} anúncio(s)</div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:12}}>
        {visibleAds.map(ad=>{const ev=evidence(ad),img=mediaUrl(ad);return <button key={ad.id} onClick={()=>setSelectedAd(ad)} className="mm-card" style={{padding:0,overflow:'hidden',textAlign:'left',cursor:'pointer',color:'inherit',border:'1px solid var(--border)'}}>
          {img?<img src={img} alt={ad.product_name||ad.advertiser_name} style={{width:'100%',height:150,objectFit:'cover',display:'block'}}/>:<div style={{height:150,display:'grid',placeItems:'center',background:'var(--bg2)',color:'var(--text3)',fontSize:11}}>Imagem ainda não validada</div>}
          <div style={{padding:13}}>
            <b style={{fontSize:13,display:'block',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ad.product_name||ad.copy?.headline||'Produto não identificado'}</b>
            <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>{ad.advertiser_name} · {ad.platform.toUpperCase()} · {ad.country}</div>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,marginTop:10,fontSize:10}}><span style={{color:'var(--purple3)',fontWeight:800}}>Evidência {ev.grade} · {ev.confidence}%</span><span style={{color:'#f5b942',fontWeight:800}}>{ad.decision||'revalidate'}</span></div>
          </div>
        </button>})}
        {!visibleAds.length&&<div className="mm-card" style={{padding:22,color:'var(--text3)',fontSize:12,textAlign:'center',gridColumn:'1/-1'}}>Nenhum anúncio coletado ainda. Cadastre uma loja; os cards aparecerão após uma coleta autorizada.</div>}
      </div>
    </section>

    {selectedAd&&<div onClick={()=>setSelectedAd(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.72)',zIndex:1000,display:'grid',placeItems:'center',padding:14}}>
      <div onClick={e=>e.stopPropagation()} className="mm-card" style={{width:'min(680px,100%)',maxHeight:'85vh',overflow:'auto',padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}><div><h2 style={{fontSize:19,margin:0}}>{selectedAd.product_name||selectedAd.copy?.headline||'Detalhes do anúncio'}</h2><div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{selectedAd.advertiser_name} · {selectedAd.platform.toUpperCase()} · {selectedAd.country}</div></div><button onClick={()=>setSelectedAd(null)} style={{border:0,background:'transparent',color:'var(--text3)',fontSize:24,cursor:'pointer'}}>×</button></div>
        <div style={{marginTop:16,fontSize:12,lineHeight:1.7,color:'var(--text2)'}}>
          <p><b>Dor:</b> {selectedAd.analysis?.pain_point||'não disponível'}<br/><b>Promessa:</b> {selectedAd.analysis?.promise||'não disponível'}<br/><b>CTA:</b> {selectedAd.copy?.cta||'não disponível'}</p>
          <p><b>Fatos observados:</b> {(selectedAd.evidence?.observed_facts||[]).join(' · ')||'nenhum registrado'}</p>
          <p><b>Sinais indiretos:</b> {(selectedAd.evidence?.indirect_signals||[]).join(' · ')||'nenhum registrado'}</p>
          <p><b>Inferências:</b> {(selectedAd.evidence?.inferences||[]).join(' · ')||'nenhuma registrada'}</p>
          <p><b>Limitações:</b> {(selectedAd.evidence?.missing_data||[]).join(' · ')||'nenhuma registrada'}</p>
          <p><b>Decisão MM:</b> {selectedAd.decision||'revalidate'} — {selectedAd.decision_reason||'Sem justificativa registrada.'}</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}><a href={selectedAd.source_url} target="_blank" rel="noreferrer" style={{background:'var(--purple)',color:'#fff',padding:'9px 12px',borderRadius:8,fontSize:11,fontWeight:800}}>ABRIR FONTE ↗</a>{selectedAd.landing_page_url&&<a href={selectedAd.landing_page_url} target="_blank" rel="noreferrer" style={{background:'var(--bg2)',color:'var(--purple3)',padding:'9px 12px',borderRadius:8,fontSize:11,fontWeight:800,border:'1px solid var(--border)'}}>PÁGINA DO PRODUTO ↗</a>}</div>
      </div>
    </div>}

    {selectedStore&&<div className="mm-card" style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:14}}><div><h2 style={{fontSize:18,margin:0}}>{selectedStore.store_name||selectedStore.domain}</h2><div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>Produtos observados · sinais públicos · venda estimada</div></div><a href={(selectedStore.metadata?.url)||`https://${selectedStore.domain}`} target="_blank" rel="noreferrer" style={{color:'var(--purple3)',fontSize:12}}>Abrir loja ↗</a></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}><thead><tr style={{color:'var(--text3)',textAlign:'left'}}><th style={{padding:'9px 8px'}}>Foto</th><th>Produto</th><th>Preço</th><th>Score sinal</th><th>Tipo</th><th>Observado</th><th>Link</th></tr></thead><tbody>
        {storeProducts.map(p=>{const productImage=p.evidence?.image||p.evidence?.images?.[0];return <tr key={p.id} style={{borderTop:'1px solid var(--border)'}}><td style={{padding:'8px'}}>{productImage?<a href={p.url} target="_blank" rel="noreferrer"><img src={productImage} alt={p.title||'Produto'} style={{width:58,height:58,objectFit:'contain',background:'#fff',borderRadius:8,border:'1px solid var(--border)',display:'block'}}/></a>:<div style={{width:58,height:58,display:'grid',placeItems:'center',border:'1px dashed var(--border)',borderRadius:8,color:'var(--text3)'}}>📦</div>}</td><td style={{padding:'11px 8px',fontWeight:650,maxWidth:360}}>{p.title||'Produto'}</td><td>{p.evidence?.price?`${Number(p.evidence.price).toFixed(2)}`:'—'}</td><td>{Math.round(Number(p.score||0))}</td><td style={{color:'#f5b942'}}>Estimativa</td><td style={{color:'var(--text3)'}}>{p.observed_at?new Date(p.observed_at).toLocaleDateString('pt-BR'):'—'}</td><td>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" style={{display:'inline-flex',padding:'7px 10px',borderRadius:7,background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.35)',color:'#34d399',fontWeight:800,textDecoration:'none'}}>ABRIR ITEM ↗</a>}</td></tr>})}
        {!storeProducts.length&&<tr><td colSpan={7} style={{padding:18,color:'var(--text3)',textAlign:'center'}}>Ainda não há produtos públicos capturados para esta loja.</td></tr>}
      </tbody></table></div>
    </div>}
  </div>
}
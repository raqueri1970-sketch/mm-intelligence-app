'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Store = { id:number; domain:string; store_name?:string; market_code?:string; platform?:string; status?:string; growth_score?:number; priority_score?:number; last_seen_at?:string; product_count?:number; price_min?:number; price_max?:number; metadata?:any }
type ProductSignal = { id:number; store_id:number; title?:string; url?:string; score?:number; evidence?:any; observed_at?:string }

export default function ConcorrentesPage(){
  const [url,setUrl]=useState('')
  const [market,setMarket]=useState('US')
  const [stores,setStores]=useState<Store[]>([])
  const [products,setProducts]=useState<ProductSignal[]>([])
  const [selected,setSelected]=useState<number|null>(null)
  const [loading,setLoading]=useState(false)
  const [message,setMessage]=useState('')

  async function load(){
    const { data,error }=await supabase.functions.invoke('mm-dashboard-api',{body:{action:'stores',marketCode:'ALL'}})
    if(error){setMessage('Erro ao carregar lojas: '+error.message);return}
    setStores(data?.stores||[]);setProducts(data?.products||[])
  }
  useEffect(()=>{load()},[])

  async function addStore(e:React.FormEvent){
    e.preventDefault();if(!url.trim())return
    setLoading(true);setMessage('Analisando a loja e lendo o catálogo público...')
    const {data,error}=await supabase.functions.invoke('mm-store-radar',{body:{action:'add_store',url:url.trim(),marketCode:market}})
    if(error){setMessage('Não foi possível adicionar: '+error.message)}
    else if(data?.ok){setMessage(`Loja adicionada. ${data.products_found||0} produtos encontrados. Vendas serão tratadas como estimativa quando não houver dado público.`);setUrl('');setSelected(data.store_id||null);await load()}
    else setMessage(data?.error||'Não foi possível analisar a loja.')
    setLoading(false)
  }

  const selectedStore=stores.find(s=>s.id===selected)||null
  const storeProducts=useMemo(()=>products.filter(p=>p.store_id===selected),[products,selected])

  return <div style={{maxWidth:1180,margin:'0 auto'}}>
    <div style={{marginBottom:22}}>
      <div style={{fontSize:12,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>Vigilância competitiva</div>
      <h1 style={{fontSize:28,margin:'5px 0 6px'}}>Lojas Monitoradas</h1>
      <p style={{color:'var(--text2)',margin:0,maxWidth:760}}>Cole somente o link da loja. O MM identifica o catálogo público, registra produtos, preços e mudanças e cria sinais para estimar quais itens estão ganhando força.</p>
    </div>

    <form onSubmit={addStore} className="mm-card" style={{padding:18,marginBottom:20}}>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 100px 160px',gap:10}}>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://loja.com" style={{height:44,border:'1px solid var(--border)',borderRadius:9,background:'var(--bg2)',color:'var(--text1)',padding:'0 13px',fontSize:14}} />
        <select value={market} onChange={e=>setMarket(e.target.value)} style={{height:44,border:'1px solid var(--border)',borderRadius:9,background:'var(--bg2)',color:'var(--text1)',padding:'0 10px'}}><option value="US">🇺🇸 US</option><option value="MX">🇲🇽 MX</option><option value="BR">🇧🇷 BR</option><option value="ES">🇪🇸 ES</option></select>
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

    {selectedStore&&<div className="mm-card" style={{padding:18}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',marginBottom:14}}><div><h2 style={{fontSize:18,margin:0}}>{selectedStore.store_name||selectedStore.domain}</h2><div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>Produtos observados · sinais públicos · venda estimada</div></div><a href={(selectedStore.metadata?.url)||`https://${selectedStore.domain}`} target="_blank" rel="noreferrer" style={{color:'var(--purple3)',fontSize:12}}>Abrir loja ↗</a></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}><thead><tr style={{color:'var(--text3)',textAlign:'left'}}><th style={{padding:'9px 8px'}}>Produto</th><th>Preço</th><th>Score sinal</th><th>Tipo</th><th>Observado</th><th></th></tr></thead><tbody>
        {storeProducts.map(p=><tr key={p.id} style={{borderTop:'1px solid var(--border)'}}><td style={{padding:'11px 8px',fontWeight:650}}>{p.title||'Produto'}</td><td>{p.evidence?.price?`$${Number(p.evidence.price).toFixed(2)}`:'—'}</td><td>{Math.round(Number(p.score||0))}</td><td style={{color:'#f5b942'}}>Estimativa</td><td style={{color:'var(--text3)'}}>{p.observed_at?new Date(p.observed_at).toLocaleDateString('pt-BR'):'—'}</td><td>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" style={{color:'var(--purple3)'}}>ver ↗</a>}</td></tr>)}
        {!storeProducts.length&&<tr><td colSpan={6} style={{padding:18,color:'var(--text3)',textAlign:'center'}}>Ainda não há produtos públicos capturados para esta loja.</td></tr>}
      </tbody></table></div>
    </div>}
  </div>
}
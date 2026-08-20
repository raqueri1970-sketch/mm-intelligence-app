'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Store = {
  id:number; domain:string; store_name:string|null; market_code:string|null; platform:string|null;
  status:string|null; priority_score:number|null; growth_score:number|null; last_seen_at:string|null; metadata:any;
}
type Signal = { id:number; store_id:number; signal_type:string; title:string|null; url:string|null; score:number|null; evidence:any; observed_at:string|null }

export default function LojasMonitoradas(){
  const [stores,setStores]=useState<Store[]>([])
  const [signals,setSignals]=useState<Signal[]>([])
  const [url,setUrl]=useState('')
  const [market,setMarket]=useState('US')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState('')
  const [open,setOpen]=useState<number|null>(null)

  async function load(){
    const [{data:s},{data:g}] = await Promise.all([
      supabase.from('mm_store_watchlist').select('*').order('last_seen_at',{ascending:false}).limit(100),
      supabase.from('mm_store_signals').select('*').order('observed_at',{ascending:false}).limit(1000)
    ])
    setStores((s||[]) as Store[]); setSignals((g||[]) as Signal[])
  }
  useEffect(()=>{load()},[])

  async function addStore(e:React.FormEvent){
    e.preventDefault(); if(!url.trim()) return
    setBusy(true); setMsg('Analisando a loja e lendo o catálogo público...')
    try{
      const {data,error}=await supabase.functions.invoke('mm-store-radar',{body:{action:'add_store',url:url.trim(),marketCode:market}})
      if(error) throw error
      if(!data?.ok) throw new Error(data?.error||'Falha ao analisar a loja')
      setMsg(`Loja adicionada. ${data.store?.productsCaptured||0} produtos encontrados nesta varredura.`)
      setUrl(''); await load(); if(data.store?.id) setOpen(Number(data.store.id))
    }catch(e:any){ setMsg(`Erro: ${e?.message||String(e)}`) }
    finally{setBusy(false)}
  }

  async function rescan(s:Store){
    setBusy(true); setMsg(`Atualizando ${s.store_name||s.domain}...`)
    try{
      const storeUrl=s.metadata?.url||`https://${s.domain}`
      const {data,error}=await supabase.functions.invoke('mm-store-radar',{body:{action:'scan_store',url:storeUrl,marketCode:s.market_code||'US',storeName:s.store_name||s.domain}})
      if(error) throw error
      setMsg(`Varredura concluída. ${data?.store?.productsCaptured||0} produtos observados.`); await load()
    }catch(e:any){setMsg(`Erro: ${e?.message||String(e)}`)}finally{setBusy(false)}
  }

  const byStore=useMemo(()=>{const m=new Map<number,Signal[]>(); for(const x of signals){const a=m.get(x.store_id)||[];a.push(x);m.set(x.store_id,a)} return m},[signals])
  function productsFor(id:number){
    const seen=new Map<string,Signal>()
    for(const s of byStore.get(id)||[]){ if(s.signal_type==='PRODUCT_OBSERVED'){const k=s.url||s.title||String(s.id); if(!seen.has(k))seen.set(k,s)} }
    return [...seen.values()].slice(0,80)
  }

  return <main style={{minHeight:'100vh',background:'#07111f',color:'#e5eef8',padding:'24px 16px 70px',fontFamily:'Arial,sans-serif'}}>
    <div style={{maxWidth:1180,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',marginBottom:18}}>
        <div><div style={{fontSize:12,color:'#64748b',letterSpacing:2}}>MM INTELLIGENCE</div><h1 style={{margin:'5px 0 0',fontSize:30}}>Vigilância de Lojas</h1><div style={{color:'#94a3b8',marginTop:5}}>Cole só o link da loja. O MM acompanha o catálogo e os sinais públicos dos produtos.</div></div>
        <Link href='/' style={{color:'#60a5fa',textDecoration:'none'}}>← Dashboard</Link>
      </div>

      <form onSubmit={addStore} style={{display:'grid',gridTemplateColumns:'1fr 110px 150px',gap:10,background:'#0b1728',border:'1px solid #1e293b',padding:14,borderRadius:14,marginBottom:12}}>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder='https://loja.com' style={{background:'#07111f',border:'1px solid #334155',borderRadius:9,padding:'12px 13px',color:'#fff',fontSize:15,minWidth:0}} />
        <select value={market} onChange={e=>setMarket(e.target.value)} style={{background:'#07111f',border:'1px solid #334155',borderRadius:9,padding:'12px 10px',color:'#fff'}}><option value='US'>EUA</option><option value='MX'>México</option><option value='GB'>Reino Unido</option><option value='CA'>Canadá</option><option value='AU'>Austrália</option></select>
        <button disabled={busy} style={{border:0,borderRadius:9,background:'#2563eb',color:'#fff',fontWeight:800,cursor:'pointer'}}>{busy?'Analisando...':'Adicionar Loja'}</button>
      </form>
      {msg&&<div style={{padding:'10px 12px',background:'#0b1728',border:'1px solid #1e293b',borderRadius:9,color:msg.startsWith('Erro')?'#fca5a5':'#86efac',marginBottom:16}}>{msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:14}}>
        {stores.map(s=>{const ps=productsFor(s.id); const expanded=open===s.id; return <section key={s.id} style={{background:'#0b1728',border:'1px solid #1e293b',borderRadius:14,overflow:'hidden'}}>
          <button onClick={()=>setOpen(expanded?null:s.id)} style={{width:'100%',textAlign:'left',background:'transparent',border:0,color:'inherit',padding:16,cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:10}}><div><div style={{fontWeight:800,fontSize:18}}>{s.store_name||s.domain}</div><div style={{color:'#60a5fa',fontSize:12,marginTop:3}}>{s.domain}</div></div><div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#94a3b8'}}>Score</div><div style={{fontSize:24,fontWeight:900,color:Number(s.growth_score||0)>=70?'#22c55e':Number(s.growth_score||0)>=45?'#f59e0b':'#94a3b8'}}>{Math.round(Number(s.growth_score||0))}</div></div></div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:12}}><span style={pill}>{s.platform||'Ecommerce'}</span><span style={pill}>{s.market_code||'US'}</span><span style={pill}>{ps.length} produtos visíveis</span></div>
          </button>
          {expanded&&<div style={{borderTop:'1px solid #1e293b',padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:10}}><b>Produtos observados</b><button disabled={busy} onClick={()=>rescan(s)} style={{background:'#172554',border:'1px solid #1d4ed8',color:'#bfdbfe',borderRadius:8,padding:'7px 10px',cursor:'pointer'}}>Atualizar agora</button></div>
            {ps.length===0?<div style={{color:'#64748b',fontSize:13}}>Ainda sem produtos capturados. Em lojas não-Shopify, o MM registra os sinais públicos disponíveis e amplia a coleta nas próximas varreduras.</div>:<div style={{display:'grid',gap:8,maxHeight:430,overflow:'auto'}}>{ps.map(p=>{const e=p.evidence||{};return <a key={p.id} href={p.url||'#'} target='_blank' rel='noreferrer' style={{display:'grid',gridTemplateColumns:'44px 1fr auto',gap:9,alignItems:'center',background:'#07111f',border:'1px solid #1e293b',borderRadius:9,padding:8,color:'inherit',textDecoration:'none'}}>{e.image?<img src={e.image} alt='' style={{width:44,height:44,objectFit:'cover',borderRadius:7}}/>:<div style={{width:44,height:44,borderRadius:7,background:'#111827'}}/>}<div><div style={{fontSize:13,fontWeight:700}}>{p.title}</div><div style={{fontSize:11,color:'#64748b'}}>{e.vendor||e.productType||'Produto monitorado'}</div></div><div style={{fontWeight:800,color:'#86efac'}}>{e.price?`$${Number(e.price).toFixed(2)}`:'—'}</div></a>})}</div>}
            <div style={{fontSize:11,color:'#64748b',marginTop:10}}>O MM usa somente sinais públicos. Quando não existir venda publicada, desempenho e vendas devem ser tratados como estimativas, nunca como números confirmados.</div>
          </div>}
        </section>})}
      </div>
      {stores.length===0&&<div style={{textAlign:'center',padding:50,color:'#64748b'}}>Nenhuma loja monitorada ainda. Cole o primeiro link acima.</div>}
    </div>
  </main>
}

const pill:React.CSSProperties={fontSize:11,color:'#cbd5e1',background:'#111827',border:'1px solid #334155',borderRadius:999,padding:'4px 8px'}

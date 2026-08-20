'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Product = { title:string; url:string; score:number; evidence?:{price?:number|null;image?:string|null;available?:boolean;estimatedSale?:boolean}; observed_at?:string }
type Store = { id:number; domain:string; store_name?:string; market_code?:string; platform?:string; status?:string; priority_score?:number; growth_score?:number; last_seen_at?:string; product_signals?:number; products?:Product[] }

export default function LojasMonitoradas(){
  const [url,setUrl]=useState('')
  const [market,setMarket]=useState('US')
  const [stores,setStores]=useState<Store[]>([])
  const [loading,setLoading]=useState(false)
  const [msg,setMsg]=useState('')
  const [open,setOpen]=useState<number|null>(null)

  async function load(){
    const {data,error}=await supabase.functions.invoke('mm-store-radar',{body:{action:'list_stores'}})
    if(error){setMsg('Não foi possível carregar as lojas agora.');return}
    setStores(data?.stores||[])
  }
  useEffect(()=>{load()},[])

  async function add(){
    if(!url.trim())return
    setLoading(true);setMsg('Analisando a loja e procurando o catálogo público...')
    const {data,error}=await supabase.functions.invoke('mm-store-radar',{body:{action:'add_store',url:url.trim(),marketCode:market}})
    if(error||!data?.ok){setMsg(data?.error||error?.message||'Não foi possível adicionar esta loja.');setLoading(false);return}
    setMsg(`Loja adicionada. ${data.productsFound||0} produtos encontrados; ${data.productsRecorded||0} registrados para acompanhamento.`)
    setUrl('');setLoading(false);await load()
  }

  return <main style={{minHeight:'100vh',background:'#070b12',color:'#eef4ff',fontFamily:'Arial,Helvetica,sans-serif'}}>
    <header style={{padding:'22px 28px',borderBottom:'1px solid #172236',background:'#0b111c',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
      <div><div style={{fontSize:22,fontWeight:900}}>MM Intelligence</div><div style={{fontSize:12,color:'#6f829e'}}>VIGILÂNCIA DE LOJAS · PRODUTOS · SINAIS</div></div>
      <Link href="/" style={{color:'#66d9ef',textDecoration:'none',fontWeight:800}}>← Dashboard</Link>
    </header>

    <div style={{maxWidth:1180,margin:'0 auto',padding:'26px 20px 50px'}}>
      <section style={{background:'#0d1522',border:'1px solid #1b2a40',borderRadius:14,padding:20,marginBottom:22}}>
        <div style={{fontSize:20,fontWeight:900,marginBottom:6}}>Adicionar loja para vigilância</div>
        <div style={{fontSize:13,color:'#8092aa',marginBottom:16}}>Cole somente o link da loja. O MM tenta identificar a plataforma, ler o catálogo público e registrar os produtos para acompanhamento.</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add()}} placeholder="https://loja.com" style={{flex:'1 1 480px',background:'#070b12',color:'#eef4ff',border:'1px solid #263956',borderRadius:9,padding:'13px 14px',fontSize:15}} />
          <select value={market} onChange={e=>setMarket(e.target.value)} style={{background:'#070b12',color:'#eef4ff',border:'1px solid #263956',borderRadius:9,padding:'0 12px'}}><option value="US">EUA</option><option value="MX">México</option><option value="GB">Reino Unido</option><option value="CA">Canadá</option><option value="AU">Austrália</option></select>
          <button onClick={add} disabled={loading} style={{border:0,borderRadius:9,padding:'12px 20px',fontWeight:900,cursor:'pointer',background:'#23d18b',color:'#06110d',opacity:loading?.7:1}}>{loading?'Analisando...':'Adicionar Loja'}</button>
        </div>
        {msg&&<div style={{marginTop:12,fontSize:13,color:'#a9bad0'}}>{msg}</div>}
      </section>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'end',marginBottom:12}}><div><div style={{fontSize:19,fontWeight:900}}>Lojas monitoradas</div><div style={{fontSize:12,color:'#71839d'}}>Clique em uma loja para abrir os produtos encontrados.</div></div><button onClick={load} style={{background:'#101a29',border:'1px solid #243650',color:'#a9bad0',borderRadius:8,padding:'8px 12px',cursor:'pointer'}}>Atualizar</button></div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:14}}>
        {stores.map(s=><article key={s.id} onClick={()=>setOpen(open===s.id?null:s.id)} style={{background:'#0d1522',border:`1px solid ${open===s.id?'#23d18b':'#1b2a40'}`,borderRadius:13,padding:17,cursor:'pointer'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><div style={{fontWeight:900,fontSize:16}}>{s.store_name||s.domain}</div><div style={{fontSize:12,color:'#7286a1',marginTop:3}}>{s.domain} · {s.platform||'Ecommerce'} · {s.market_code||'US'}</div></div><div style={{fontSize:12,color:'#23d18b',fontWeight:900}}>{s.status||'ATIVA'}</div></div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:14}}><Mini label="Produtos" value={s.product_signals||0}/><Mini label="Score" value={Math.round(Number(s.priority_score||0))}/><Mini label="Crescimento" value={Math.round(Number(s.growth_score||0))}/></div>
          {open===s.id&&<div style={{marginTop:15,borderTop:'1px solid #1b2a40',paddingTop:12}}>
            {(s.products||[]).length===0?<div style={{fontSize:13,color:'#74869e'}}>Ainda sem produtos públicos registrados para esta loja.</div>:(s.products||[]).map((p,i)=><a key={i} href={p.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{display:'flex',gap:10,alignItems:'center',padding:'9px 0',borderBottom:'1px solid #142033',color:'#dce7f5',textDecoration:'none'}}>{p.evidence?.image?<img src={p.evidence.image} alt="" style={{width:44,height:44,objectFit:'cover',borderRadius:7,background:'#111'}}/>:<div style={{width:44,height:44,borderRadius:7,background:'#111b2a'}}/>}<div style={{minWidth:0,flex:1}}><div style={{fontSize:13,fontWeight:800,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.title}</div><div style={{fontSize:11,color:'#7387a2',marginTop:3}}>{p.evidence?.price?`US$ ${Number(p.evidence.price).toFixed(2)}`:'Preço não capturado'} · {p.evidence?.available===false?'Indisponível':'Disponível/aparente'} · venda estimada</div></div><div style={{fontWeight:900,color:'#ffd166'}}>{Math.round(Number(p.score||0))}</div></a>)}
          </div>}
        </article>)}
      </div>
      {stores.length===0&&<div style={{textAlign:'center',padding:50,color:'#6f829e'}}>Nenhuma loja monitorada ainda. Cole o primeiro link acima.</div>}
      <div style={{marginTop:22,fontSize:11,color:'#5f718a'}}>O MM usa somente sinais públicos. Quando a loja não publica vendas reais, qualquer indicação de venda é tratada como estimativa e deve ser cruzada com estoque, anúncios, tráfego e tendência.</div>
    </div>
  </main>
}

function Mini({label,value}:{label:string;value:number}){return <div style={{background:'#09101a',border:'1px solid #17243a',borderRadius:8,padding:'9px 8px'}}><div style={{fontSize:10,color:'#657995'}}>{label}</div><div style={{fontSize:17,fontWeight:900,marginTop:2}}>{value}</div></div>}

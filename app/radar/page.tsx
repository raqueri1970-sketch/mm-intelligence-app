'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '@/lib/supabase'

type Product={
 id:string;name:string;signal_query:string;market_code:string;source_name?:string;competitor_name?:string;
 store_url:string;image_url:string;price?:number;currency?:string;verified_at:string;rating?:number;reviews?:number;
 sales_status?:string;opportunity_score:number;demand_score:number;momentum_score:number;commercial_score:number;
 sources_count:number;data_quality_pct:number;status:string
}

function Score({value}:{value:number}){const n=Math.round(Number(value||0)),c=n>=75?'#34d399':n>=55?'#fbbf24':'#fb7185';return <span style={{display:'inline-grid',placeItems:'center',width:44,height:44,borderRadius:'50%',border:`3px solid ${c}`,color:c,fontWeight:800,fontFamily:'var(--mono)'}}>{n}</span>}
function money(value?:number,currency='USD'){if(value==null)return 'Preço não capturado';try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(value)}catch{return '$'+value}}
function evidence(p:Product){if(p.sales_status&& !['NOT_AVAILABLE','UNKNOWN'].includes(p.sales_status))return 'Venda pública confirmada';if(Number(p.reviews)>0)return `${Number(p.reviews).toLocaleString('pt-BR')} avaliações públicas`;return 'Evidência insuficiente'}

export default function RadarPage(){
 const [rows,setRows]=useState<Product[]>([])
 const [market,setMarket]=useState('US')
 const [search,setSearch]=useState('')
 const [loading,setLoading]=useState(true)
 const [refreshing,setRefreshing]=useState(false)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState<Product|null>(null)

 async function load(){
  setLoading(true);setError('')
  const {data,error}=await supabase.functions.invoke('mm-dashboard-api',{body:{action:'real-products',marketCode:market,limit:200}})
  if(error){setError(error.message);setRows([]);setLoading(false);return}
  const candidates=(data?.products||[]).filter((p:Product)=>p.name&&p.image_url&&p.store_url&&(Number(p.reviews)>0||(p.sales_status&&!['NOT_AVAILABLE','UNKNOWN'].includes(p.sales_status))))
  const checked=await Promise.all(candidates.map((p:Product)=>new Promise<Product|null>(resolve=>{
   const img=new Image(),timer=window.setTimeout(()=>resolve(null),7000)
   img.onload=()=>{window.clearTimeout(timer);resolve(img.naturalWidth>0&&img.naturalHeight>0?p:null)}
   img.onerror=()=>{window.clearTimeout(timer);resolve(null)}
   img.src=p.image_url
  })))
  setRows(checked.filter(Boolean) as Product[]);setLoading(false)
 }
 useEffect(()=>{load()},[market])

 async function refresh(){
  setRefreshing(true);setError('')
  const {error}=await supabase.functions.invoke('mm-intelligent-discovery',{body:{marketCode:market}})
  if(error)setError('A coleta não concluiu: '+error.message)
  await load();setRefreshing(false)
 }

 const filtered=useMemo(()=>rows.filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||p.signal_query?.toLowerCase().includes(search.toLowerCase())),[rows,search])
 const avg=rows.length?Math.round(rows.reduce((s,p)=>s+Number(p.opportunity_score||0),0)/rows.length):0
 const totalReviews=rows.reduce((s,p)=>s+Number(p.reviews||0),0)
 const latest=rows.length?new Date(Math.max(...rows.map(p=>new Date(p.verified_at).getTime()))):null

 if(loading)return <div className="mm-loading"><div className="mm-spinner"/>Validando produtos reais...</div>

 return <div className="mm-fade-in">
  <div className="mm-page-header" style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'end',flexWrap:'wrap'}}>
   <div><h1 className="mm-page-title">Radar de Produtos Reais</h1><p className="mm-page-subtitle">Somente item específico · foto real · link direto · evidência pública de mercado</p></div>
   <button onClick={refresh} disabled={refreshing} style={{height:42,padding:'0 16px',border:0,borderRadius:9,background:'var(--purple)',color:'#fff',fontWeight:700,cursor:refreshing?'wait':'pointer'}}>{refreshing?'ATUALIZANDO...':'ATUALIZAR AGORA'}</button>
  </div>

  <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
   <input className="mm-search" placeholder="🔍 Buscar produto real..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <select className="mm-search" style={{width:170}} value={market} onChange={e=>setMarket(e.target.value)}><option value="US">🇺🇸 Estados Unidos</option><option value="MX">🇲🇽 México</option></select>
  </div>
  {error&&<div style={{padding:12,marginBottom:14,border:'1px solid rgba(251,113,133,.4)',borderRadius:8,color:'#fb7185',background:'rgba(251,113,133,.08)'}}>{error}</div>}

  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:16}}>
   {[
    ['Produtos reais',rows.length,'#a78bfa'],['Score médio',avg,'#34d399'],['Avaliações públicas',totalReviews.toLocaleString('pt-BR'),'#60a5fa'],['Com foto',rows.length,'#fbbf24'],['Com link direto',rows.length,'#c084fc']
   ].map(([l,v,c])=><div key={String(l)} className="mm-card" style={{padding:14}}><div style={{fontSize:23,fontWeight:800,color:String(c),fontFamily:'var(--mono)'}}>{v}</div><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{l}</div></div>)}
  </div>

  <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',marginBottom:10}}>Última verificação: {latest?latest.toLocaleString('pt-BR'):'sem dados'} · mostrando {filtered.length}</div>

  <div className="mm-card"><div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>#</th><th>Produto real</th><th>Score</th><th>Evidência de mercado</th><th>Avaliação</th><th>Preço</th><th>Loja/Fonte</th><th>Verificado</th><th>Link</th></tr></thead><tbody>
   {!filtered.length?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text3)'}}>Nenhum produto cumpriu todas as regras: item específico, foto, link e evidência pública.</td></tr>:filtered.map((p,i)=><tr key={p.id}>
    <td style={{fontFamily:'var(--mono)',color:'var(--text3)'}}>{String(i+1).padStart(2,'0')}</td>
    <td style={{minWidth:360}}><div style={{display:'flex',alignItems:'center',gap:12}}>
     <img src={p.image_url} alt={p.name} onClick={()=>setSelected(p)} title="Clique para ampliar" style={{width:68,height:68,objectFit:'contain',background:'#fff',borderRadius:10,border:'1px solid var(--border)',cursor:'zoom-in',flexShrink:0}}/>
     <div><div style={{fontWeight:700,color:'var(--text)',fontSize:13,lineHeight:1.35}}>{p.name}</div><div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>{p.signal_query} · {p.market_code}</div></div>
    </div></td>
    <td><Score value={p.opportunity_score}/></td>
    <td><span className={'mm-status '+(p.status==='VENDA_CONFIRMADA'?'mm-status--winner':p.status==='FORTE'?'mm-status--testing':'mm-status--new')}>{evidence(p)}</span></td>
    <td style={{fontFamily:'var(--mono)',fontSize:11}}>{p.rating?<>★ {Number(p.rating).toFixed(1)}<br/><span style={{color:'var(--text3)'}}>{Number(p.reviews).toLocaleString('pt-BR')} reviews</span></>:'—'}</td>
    <td style={{fontFamily:'var(--mono)',fontSize:11,color:p.price?'#34d399':'var(--text3)'}}>{money(p.price,p.currency)}</td>
    <td style={{fontSize:11}}><b>{p.competitor_name||p.source_name||'Web'}</b><div style={{fontSize:9,color:'var(--text3)',marginTop:3}}>{p.source_name}</div></td>
    <td style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--text3)'}}>{new Date(p.verified_at).toLocaleDateString('pt-BR')}</td>
    <td><a href={p.store_url} target="_blank" rel="noopener noreferrer" title="Abrir produto real" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',height:32,padding:'0 10px',borderRadius:7,background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.35)',color:'#34d399',fontWeight:800,textDecoration:'none',fontSize:10}}>VER ITEM ↗</a></td>
   </tr>)}
  </tbody></table></div></div>

  <div style={{padding:'11px 14px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:9,fontSize:11,color:'var(--text3)',lineHeight:1.6}}>Regra do Radar: produto genérico não entra. “Avaliações públicas” confirma atividade comercial e relevância, mas não representa unidades vendidas. Quantidade vendida só será exibida quando a plataforma publicar esse dado.</div>

  {selected&&<div onClick={()=>setSelected(null)} style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.86)',display:'grid',placeItems:'center',padding:20}}>
   <div onClick={e=>e.stopPropagation()} className="mm-card" style={{position:'relative',width:'min(820px,96vw)',maxHeight:'92vh',padding:16}}>
    <button onClick={()=>setSelected(null)} aria-label="Fechar imagem" style={{position:'absolute',right:10,top:8,zIndex:2,width:36,height:36,borderRadius:'50%',border:'1px solid var(--border)',background:'rgba(10,10,18,.86)',color:'#fff',fontSize:24,cursor:'pointer'}}>×</button>
    <img src={selected.image_url} alt={selected.name} style={{display:'block',width:'100%',height:'min(62vh,620px)',objectFit:'contain',background:'#fff',borderRadius:10}}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:12,flexWrap:'wrap'}}><div><div style={{fontWeight:700,fontSize:15}}>{selected.name}</div><div style={{fontSize:10,color:'#34d399',marginTop:4}}>{evidence(selected)} · link direto validado</div></div><a href={selected.store_url} target="_blank" rel="noopener noreferrer" style={{padding:'9px 13px',borderRadius:8,background:'rgba(16,185,129,.14)',border:'1px solid rgba(16,185,129,.4)',color:'#34d399',fontWeight:800,textDecoration:'none',fontSize:11}}>ABRIR PRODUTO ↗</a></div>
   </div>
  </div>}
 </div>
}

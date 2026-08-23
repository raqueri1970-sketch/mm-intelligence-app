'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '@/lib/supabase'

type Opportunity={
 id:string;query:string;market_code:string;domain?:string;subgroup?:string;
 opportunity_score:number;demand_score:number;momentum_score:number;commercial_score:number;
 saturation_score:number;novelty_score:number;sources_count:number;data_quality_pct:number;
 status:string;evidence?:any;created_at:string
}

function Score({value}:{value:number}){const n=Math.round(Number(value||0)),c=n>=75?'#34d399':n>=55?'#fbbf24':'#fb7185';return <span style={{display:'inline-grid',placeItems:'center',width:42,height:42,borderRadius:'50%',border:`3px solid ${c}`,color:c,fontWeight:900,fontFamily:'var(--mono)'}}>{n}</span>}

export default function RadarPage(){
 const [rows,setRows]=useState<Opportunity[]>([])
 const [market,setMarket]=useState('US')
 const [search,setSearch]=useState('')
 const [loading,setLoading]=useState(true)
 const [refreshing,setRefreshing]=useState(false)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState<Opportunity|null>(null)

 async function load(){
  setLoading(true);setError('')
  const {data,error}=await supabase.functions.invoke('mm-dashboard-api',{body:{action:'radar',marketCode:market}})
  if(error)setError(error.message)
  else setRows((data?.opportunities||[]) as Opportunity[])
  setLoading(false)
 }
 useEffect(()=>{load()},[market])

 async function refresh(){
  setRefreshing(true);setError('')
  const {error}=await supabase.functions.invoke('mm-intelligent-discovery',{body:{marketCode:market}})
  if(error)setError('A coleta não concluiu: '+error.message)
  await load();setRefreshing(false)
 }

 const filtered=useMemo(()=>rows.filter(r=>!search||r.query.toLowerCase().includes(search.toLowerCase())||(r.subgroup||'').toLowerCase().includes(search.toLowerCase())),[rows,search])
 const latest=rows.length?new Date(Math.max(...rows.map(r=>new Date(r.created_at).getTime()))):null
 const avg=(key:keyof Opportunity)=>rows.length?Math.round(rows.reduce((s,r)=>s+Number(r[key]||0),0)/rows.length):0

 if(loading)return <div className="mm-loading"><div className="mm-spinner"/>Carregando radar...</div>

 return <div className="mm-fade-in">
  <div className="mm-page-header" style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'end',flexWrap:'wrap'}}>
   <div><h1 className="mm-page-title">Radar de Oportunidades</h1><p className="mm-page-subtitle">Termos amplos da web · produtos específicos aparecem somente após validação</p></div>
   <button onClick={refresh} disabled={refreshing} style={{height:42,padding:'0 16px',border:0,borderRadius:9,background:'var(--purple)',color:'#fff',fontWeight:800,cursor:refreshing?'wait':'pointer'}}>{refreshing?'ATUALIZANDO...':'ATUALIZAR AGORA'}</button>
  </div>

  <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
   <input className="mm-search" placeholder="🔍 Buscar termo ou nicho..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <select className="mm-search" style={{width:150}} value={market} onChange={e=>setMarket(e.target.value)}><option value="US">🇺🇸 Estados Unidos</option><option value="MX">🇲🇽 México</option></select>
  </div>

  {error&&<div style={{padding:12,marginBottom:14,border:'1px solid rgba(251,113,133,.4)',borderRadius:8,color:'#fb7185',background:'rgba(251,113,133,.08)'}}>{error}</div>}

  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:16}}>
   {[
    ['Oportunidades',rows.length,'#a78bfa'],['Score médio',avg('opportunity_score'),'#34d399'],['Demanda',avg('demand_score'),'#60a5fa'],['Momentum',avg('momentum_score'),'#fbbf24'],['Qualidade',avg('data_quality_pct')+'%','#c084fc']
   ].map(([l,v,c])=><div key={String(l)} className="mm-card" style={{padding:14}}><div style={{fontSize:24,fontWeight:900,color:String(c),fontFamily:'var(--mono)'}}>{v}</div><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginTop:4}}>{l}</div></div>)}
  </div>

  <div style={{fontSize:10,color:'var(--text3)',fontFamily:'var(--mono)',marginBottom:10}}>Última descoberta: {latest?latest.toLocaleString('pt-BR'):'sem dados'} · mostrando {filtered.length}</div>

  <div className="mm-card"><div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>#</th><th>Termo pesquisado</th><th>Mercado</th><th>Score</th><th>Demanda</th><th>Momentum</th><th>Comercial</th><th>Fontes</th><th>Qualidade</th><th>Status</th></tr></thead><tbody>
   {!filtered.length?<tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'var(--text3)'}}>Nenhuma oportunidade encontrada.</td></tr>:filtered.map((r,i)=><tr key={r.id} onClick={()=>setSelected(r)} style={{cursor:'pointer'}}>
    <td style={{fontFamily:'var(--mono)',color:'var(--text3)'}}>{String(i+1).padStart(2,'0')}</td>
    <td style={{minWidth:250}}><div style={{fontWeight:800,color:'var(--text)',fontSize:13}}>{r.query}</div><div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{r.subgroup||r.domain||'Saúde & Beleza'} · termo de descoberta</div></td>
    <td><span className="mm-niche">{r.market_code}</span></td>
    <td><Score value={r.opportunity_score}/></td>
    <td>{Math.round(Number(r.demand_score||0))}</td><td>{Math.round(Number(r.momentum_score||0))}</td><td>{Math.round(Number(r.commercial_score||0))}</td>
    <td>{r.sources_count||0}</td><td>{r.data_quality_pct||0}%</td>
    <td><span className={'mm-status mm-status--'+(r.status==='OBSERVAR'?'testing':'new')}>{r.status}</span></td>
   </tr>)}
  </tbody></table></div></div>

  {selected&&<div onClick={()=>setSelected(null)} style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(0,0,0,.78)',display:'grid',placeItems:'center',padding:18}}>
   <div onClick={e=>e.stopPropagation()} className="mm-card" style={{width:'min(680px,96vw)',maxHeight:'86vh',overflow:'auto',padding:20}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><h2 style={{margin:0,fontSize:20}}>{selected.query}</h2><div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{selected.market_code} · termo amplo do Radar</div></div><button onClick={()=>setSelected(null)} style={{border:0,background:'transparent',color:'#fff',fontSize:25,cursor:'pointer'}}>×</button></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:18}}>
     {[['Oportunidade',selected.opportunity_score],['Demanda',selected.demand_score],['Momentum',selected.momentum_score],['Comercial',selected.commercial_score],['Saturação',selected.saturation_score],['Novidade',selected.novelty_score]].map(([l,v])=><div key={String(l)} style={{padding:12,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8}}><b style={{fontSize:18}}>{Math.round(Number(v||0))}</b><div style={{fontSize:9,color:'var(--text3)',marginTop:3}}>{l}</div></div>)}
    </div>
    <p style={{fontSize:12,lineHeight:1.7,color:'var(--text2)'}}>Este registro mede uma oportunidade de pesquisa. Ele só será promovido para Produtos quando o MM identificar um item concreto com nome específico, foto carregável, link direto e identidade validada.</p>
    <pre style={{fontSize:10,whiteSpace:'pre-wrap',color:'var(--text3)',background:'var(--bg2)',padding:12,borderRadius:8,overflow:'auto'}}>{JSON.stringify(selected.evidence||{},null,2)}</pre>
   </div>
  </div>}
 </div>
}

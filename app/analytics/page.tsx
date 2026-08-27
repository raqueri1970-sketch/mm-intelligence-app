'use client'
import {useEffect,useMemo,useState} from 'react'
import {supabase} from '@/lib/supabase'
export default function AnalyticsPage(){
 const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{supabase.from('ranking_view').select('*').limit(500).then(({data,error})=>{if(error)setError(error.message);setRows(data||[]);setLoading(false)})},[])
 const stats=useMemo(()=>({total:rows.length,avg:rows.length?Math.round(rows.reduce((s,r)=>s+Number(r.score_final||0),0)/rows.length):0,winners:rows.filter(r=>r.status==='winner').length,ouro:rows.filter(r=>String(r.timing||'').includes('OURO')).length}),[rows])
 if(loading)return <div className="mm-loading"><div className="mm-spinner"/>Carregando analytics...</div>
 return <div className="mm-fade-in"><div className="mm-page-header"><h1 className="mm-page-title">Analytics</h1><p className="mm-page-subtitle">Visão consolidada dos produtos reais gravados na MM</p></div>{error&&<div style={{color:'#ef4444',marginBottom:14}}>{error}</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>{[['Produtos',stats.total],['Score médio',stats.avg],['Vencedores',stats.winners],['Timing Ouro',stats.ouro]].map(([l,v])=><div className="mm-card" key={String(l)} style={{padding:18}}><div style={{fontSize:28,fontWeight:900,color:'var(--purple2)'}}>{v}</div><div style={{fontSize:11,color:'var(--text3)',marginTop:5}}>{l}</div></div>)}</div></div>
}

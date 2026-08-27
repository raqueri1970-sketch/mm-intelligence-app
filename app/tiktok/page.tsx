'use client'

import { useEffect, useMemo, useState } from 'react'

type Health={source_name:string,status:string,last_ok_at:string|null,last_error:string|null,last_check_at:string|null,metadata:any}
type Signal={source_name:string,title:string|null,url:string|null,score:number|null,observed_at:string|null}
type Guard={source:string,month:string,limit_per_month:number,used:number,updated_at:string}
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):'—'
const color=(s:string)=>s==='OK'?'#10b981':s==='DOWN'?'#ef4444':'#f59e0b'

export default function TikTokPage(){
 const [health,setHealth]=useState<Health[]>([]),[signals,setSignals]=useState<Signal[]>([]),[guards,setGuards]=useState<Guard[]>([])
 const [loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);fetch('/api/tiktok/status',{cache:'no-store',signal:c.signal}).then(async r=>{const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);setHealth(j.health||[]);setSignals(j.signals||[]);setGuards(j.guards||[])}).catch(e=>setError(e?.name==='AbortError'?'Tempo esgotado ao carregar TikTok':e?.message||'Falha ao carregar TikTok')).finally(()=>{clearTimeout(t);setLoading(false)});return()=>{clearTimeout(t);c.abort()}},[])
 const latest=useMemo(()=>{const m:Record<string,Signal|undefined>={};for(const s of signals)if(!m[s.source_name])m[s.source_name]=s;return m},[signals])
 const fresh=(n:string,h?:Health)=>{const d=latest[n]?.observed_at||h?.last_ok_at;return !!d&&Date.now()-new Date(d).getTime()<=24*60*60*1000}
 if(loading)return <div style={{padding:48,color:'var(--text3)'}}>Carregando diagnóstico do TikTok...</div>
 return <div style={{paddingBottom:32}}>
  <div style={{marginBottom:20}}><h1 style={{fontSize:22,margin:0,color:'var(--text)'}}>TikTok — Saúde da Fonte</h1><p style={{color:'var(--text3)',fontSize:12}}>Conta autorizada e sinais de mercado, sem inventar métricas.</p></div>
  {error&&<div style={{padding:14,marginBottom:16,border:'1px solid #ef444455',borderRadius:10,color:'#ef4444'}}>Falha de leitura: {error}. <a href="/tiktok/connect" style={{color:'inherit'}}>Testar conexão</a></div>}
  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}><a href="/tiktok/connect" style={{color:'#fff',background:'#111827',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',textDecoration:'none'}}>Conectar / testar TikTok</a><a href="https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?period=30&region=US" target="_blank" rel="noopener noreferrer" style={{color:'#fff',background:'#111827',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',textDecoration:'none'}}>Creative Center US ↗</a></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:12,marginBottom:18}}>{['TikTok','TikTok Ads'].map(n=>{const h=health.find(x=>x.source_name===n),l=latest[n],st=fresh(n,h)?(h?.status||'OK'):'DEGRADED';return <div key={n} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:16}}><div style={{display:'flex',justifyContent:'space-between'}}><strong>{n}</strong><b style={{color:color(st)}}>{st}</b></div><div style={{marginTop:12,fontSize:12,color:'var(--text3)',lineHeight:1.7}}>Último sinal: <b style={{color:'var(--text)'}}>{fmt(l?.observed_at)}</b><br/>Última checagem: <b style={{color:'var(--text)'}}>{fmt(h?.last_check_at)}</b><br/>Modo: <b style={{color:'var(--text)'}}>{h?.metadata?.fallback==='PUBLIC_WEB'?'Descoberta pública / fallback':'API monitorada'}</b></div>{h?.last_error&&<div style={{marginTop:8,color:'#f59e0b',fontSize:11}}>{h.last_error}</div>}</div>})}</div>
  <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:16,marginBottom:18}}><strong>Cota atual</strong>{guards.length===0?<div style={{color:'var(--text3)',marginTop:10}}>Sem cota registrada.</div>:guards.map(g=><div key={g.source} style={{marginTop:10,fontSize:12,color:'var(--text3)'}}>{g.source}: <b style={{color:'var(--text)'}}>{g.used}/{g.limit_per_month}</b> · {g.month}</div>)}</div>
  <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}><div style={{padding:14,fontWeight:700}}>Últimos sinais gravados</div>{signals.length===0?<div style={{padding:20,color:'var(--text3)'}}>Nenhum sinal encontrado.</div>:signals.map((s,i)=><div key={i} style={{padding:'10px 16px',borderTop:'1px solid var(--border)'}}><div style={{fontSize:12}}>{s.title||s.source_name}</div><div style={{fontSize:10,color:'var(--text3)'}}>{s.source_name} · {fmt(s.observed_at)}</div></div>)}</div>
 </div>
}

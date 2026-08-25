'use client'
import { FormEvent, useEffect, useState } from 'react'

type Video={videoId:string;title:string;description:string;channel:string;publishedAt:string;thumbnail:string;views:number;likes:number;comments:number;url:string}

export default function YouTubePage(){
 const [q,setQ]=useState('pain relief product')
 const [region,setRegion]=useState('US')
 const [videos,setVideos]=useState<Video[]>([])
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [collectedAt,setCollectedAt]=useState('')

 async function search(e?:FormEvent){
  e?.preventDefault();setLoading(true);setError('')
  try{
   const r=await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&region=${region}&limit=15`,{cache:'no-store'})
   const d=await r.json()
   if(!r.ok)throw new Error(d?.details?.message||d?.error||'Falha na consulta')
   setVideos(d.videos||[]);setCollectedAt(d.collectedAt||'')
  }catch(err){setVideos([]);setError(err instanceof Error?err.message:String(err))}finally{setLoading(false)}
 }
 useEffect(()=>{search()},[])
 const views=videos.reduce((s,v)=>s+v.views,0)

 return <div className="mm-fade-in">
  <div className="mm-page-header"><h1 className="mm-page-title">YouTube · Sinais de Mercado</h1><p className="mm-page-subtitle">Fonte oficial YouTube Data API v3 · vídeos, canais, views, likes e evidência pública</p></div>
  <form onSubmit={search} style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
   <input className="mm-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Produto, dor ou nicho..." style={{minWidth:320}}/>
   <select className="mm-search" value={region} onChange={e=>setRegion(e.target.value)} style={{width:180}}><option value="US">🇺🇸 Estados Unidos</option><option value="MX">🇲🇽 México</option></select>
   <button disabled={loading} style={{border:0,borderRadius:8,padding:'0 18px',background:'var(--purple)',color:'#fff',fontWeight:800,cursor:'pointer'}}>{loading?'COLETANDO...':'BUSCAR NO YOUTUBE'}</button>
  </form>
  {error&&<div style={{padding:12,border:'1px solid rgba(251,113,133,.4)',borderRadius:8,color:'#fb7185',marginBottom:14}}>YouTube: {error}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginBottom:16}}>
   {[['Vídeos encontrados',videos.length],['Views públicas',views.toLocaleString('pt-BR')],['Região',region],['Fonte','API oficial']].map(([a,b])=><div className="mm-card" key={String(a)} style={{padding:14}}><div style={{fontSize:22,fontWeight:800,color:'var(--purple3)'}}>{b}</div><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',marginTop:4}}>{a}</div></div>)}
  </div>
  {collectedAt&&<div style={{fontSize:10,color:'var(--text3)',marginBottom:10}}>Coleta: {new Date(collectedAt).toLocaleString('pt-BR')}</div>}
  <div className="mm-card"><div className="mm-table-wrap"><table className="mm-table"><thead><tr><th>#</th><th>Vídeo / Produto</th><th>Canal</th><th>Views</th><th>Likes</th><th>Comentários</th><th>Publicado</th><th>Link</th></tr></thead><tbody>
   {!videos.length?<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'var(--text3)'}}>{loading?'Consultando YouTube...':'Nenhum sinal carregado.'}</td></tr>:videos.map((v,i)=><tr key={v.videoId}><td>{String(i+1).padStart(2,'0')}</td><td style={{minWidth:380}}><div style={{display:'flex',gap:12,alignItems:'center'}}><img src={v.thumbnail} alt="" style={{width:110,height:62,objectFit:'cover',borderRadius:8}}/><div><b style={{fontSize:12}}>{v.title}</b><div style={{fontSize:9,color:'var(--text3)',marginTop:4}}>{v.description.slice(0,140)}</div></div></div></td><td>{v.channel}</td><td style={{fontFamily:'var(--mono)',color:'#34d399'}}>{v.views.toLocaleString('pt-BR')}</td><td>{v.likes.toLocaleString('pt-BR')}</td><td>{v.comments.toLocaleString('pt-BR')}</td><td>{v.publishedAt?new Date(v.publishedAt).toLocaleDateString('pt-BR'):'—'}</td><td><a href={v.url} target="_blank" rel="noopener noreferrer" style={{color:'#60a5fa',fontWeight:800}}>VER ↗</a></td></tr>)}
  </tbody></table></div></div>
 </div>
}

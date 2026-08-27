'use client'
import { useState } from 'react'

export default function AmazonPage(){
 const [q,setQ]=useState('pain relief device')
 const url=`https://www.amazon.com/s?k=${encodeURIComponent(q)}`
 return <div className="mm-fade-in">
  <div className="mm-page-header"><h1 className="mm-page-title">Amazon · Inteligência de Produto</h1><p className="mm-page-subtitle">Pesquisa de mercado Amazon US para validar produtos físicos. Não representa vendas da sua conta.</p></div>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}><input className="mm-search" value={q} onChange={e=>setQ(e.target.value)} placeholder="Produto, dor ou nicho..." style={{minWidth:320}}/><a href={url} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',borderRadius:8,padding:'0 18px',background:'var(--purple)',color:'#fff',fontWeight:800,textDecoration:'none'}}>PESQUISAR AMAZON US ↗</a></div>
  <div className="mm-card" style={{padding:20}}><h2 style={{fontSize:16,marginTop:0}}>Fonte Amazon</h2><p style={{color:'var(--text3)',lineHeight:1.7,fontSize:12}}>A página foi restaurada no dashboard. A MM só exibirá métricas automáticas da Amazon quando houver uma fonte de dados real e verificável conectada; não serão fabricados ranking, volume de vendas, preço ou avaliações.</p><div style={{marginTop:14,padding:12,border:'1px solid var(--border)',borderRadius:10,color:'#f59e0b',fontSize:12}}>Status da coleta automática: ainda não conectada neste repositório. Pesquisa pública disponível pelo botão acima.</div></div>
 </div>
}

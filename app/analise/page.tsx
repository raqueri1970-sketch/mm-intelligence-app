'use client'

import { useState } from 'react'

const SUPABASE_URL = 'https://tazyeczbbgspqbyluynf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_olCaCIksSYJGOaAYInXHeA_2pm-gaoF'

type Result = any

async function invoke(slug: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `${slug}: HTTP ${res.status}`)
  return data
}

export default function AnalisePage() {
  const [produto, setProduto] = useState('')
  const [market, setMarket] = useState('US')
  const [loading, setLoading] = useState(false)
  const [pain, setPain] = useState<Result>(null)
  const [creative, setCreative] = useState<Result>(null)
  const [erro, setErro] = useState('')

  async function analisar() {
    const q = produto.trim()
    if (!q) return
    setLoading(true); setErro(''); setPain(null); setCreative(null)
    try {
      const [p, c] = await Promise.all([
        invoke('mm-pain-demand-agent', { products: [q], marketCode: market }),
        invoke('mm-creative-hunter', { keyword: q, marketCode: market }),
      ])
      setPain(p); setCreative(c)
    } catch (e: any) {
      setErro(e?.message || String(e))
    } finally { setLoading(false) }
  }

  const pr = pain?.results?.[0]
  const creatives = creative?.creatives || []

  return (
    <div className="mm-fade-in" style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:11,color:'#a78bfa',fontWeight:800,letterSpacing:1.5,marginBottom:7}}>MM INTELLIGENCE · NOVO MOTOR</div>
        <h1 style={{fontSize:26,fontWeight:900,marginBottom:7}}>Pré-análise de Dor + Caçador de Criativos</h1>
        <p style={{color:'var(--text3)',fontSize:13,lineHeight:1.6}}>Só produto físico. O agente mede dor, urgência, risco de piora e demanda; depois procura evidências e criativos em múltiplas fontes. Cápsulas, suplementos ingeríveis e infoprodutos ficam fora do foco da MM.</p>
      </div>

      <div className="mm-card" style={{marginBottom:18}}><div className="mm-card__body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 110px',gap:10,marginBottom:10}}>
          <input value={produto} onChange={e=>setProduto(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analisar()} placeholder="Ex.: dark spot patch, shoulder pain brace, hair loss device" style={{width:'100%',padding:'13px 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)',fontSize:14}} />
          <select value={market} onChange={e=>setMarket(e.target.value)} style={{borderRadius:10,border:'1px solid var(--border)',background:'var(--bg3)',color:'var(--text)',padding:'0 10px'}}><option value="US">EUA</option><option value="MX">México</option></select>
        </div>
        <button className="mm-btn" onClick={analisar} disabled={loading} style={{width:'100%'}}>{loading?'Agentes trabalhando...':'Analisar produto agora'}</button>
        {erro&&<div style={{marginTop:12,padding:12,borderRadius:9,background:'rgba(239,68,68,.1)',color:'#f87171',fontSize:12}}>{erro}</div>}
      </div></div>

      {pr&&<div className="mm-card" style={{marginBottom:18}}>
        <div className="mm-card__header"><span className="mm-card__title">Agente Dor & Urgência</span></div>
        <div className="mm-card__body">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:10,marginBottom:14}}>
            {[['Score',pr.score],['Decisão',pr.decisao],['Fontes OK',pr.fontes_ok?.length||0],['Fontes falharam',pr.fontes_falha?.length||0]].map(([l,v])=><div key={String(l)} style={{padding:13,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)'}}><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',marginBottom:5}}>{l}</div><div style={{fontSize:18,fontWeight:800}}>{String(v??'—')}</div></div>)}
          </div>
          <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.7}}><strong>Confirmadas:</strong> {(pr.fontes_ok||[]).join(', ')||'nenhuma'}<br/><strong>Falharam:</strong> {(pr.fontes_falha||[]).join(', ')||'nenhuma'}</div>
        </div>
      </div>}

      {creative&&<div className="mm-card">
        <div className="mm-card__header"><span className="mm-card__title">Caçador de Criativos</span><span style={{marginLeft:'auto',fontSize:11,color:'var(--text3)'}}>{creative.linksFound||0} links encontrados · {creative.saved||0} salvos</span></div>
        <div className="mm-card__body">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:10,marginBottom:14}}>{(creative.collectors||[]).map((x:any)=><div key={x.source} style={{padding:10,borderRadius:9,background:'var(--bg3)',border:'1px solid var(--border)',fontSize:12}}><span style={{color:x.ok?'#34d399':'#f87171'}}>●</span> {x.source} · {x.ok?'OK':'falhou'}</div>)}</div>
          {creatives.length===0?<div style={{color:'var(--text3)',fontSize:13}}>Nenhum criativo confirmado nesta rodada. O agente mantém as outras fontes e registra as falhas.</div>:<div style={{display:'flex',flexDirection:'column',gap:8}}>{creatives.map((c:any,i:number)=><a key={c.url+i} href={c.url} target="_blank" rel="noopener noreferrer" style={{display:'flex',gap:10,alignItems:'center',padding:'11px 12px',borderRadius:9,background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',textDecoration:'none',fontSize:12}}><strong style={{color:'#a78bfa'}}>{c.platform}</strong><span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{c.title||c.url}</span><span>↗</span></a>)}</div>}
        </div>
      </div>}
    </div>
  )
}

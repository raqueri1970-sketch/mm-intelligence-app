'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Anunciante = { page_id: string; nome: string; anuncios_ativos: number }
type Vencedor = {
 data: string; chave: string; nota: number; posicao: number; titulo: string | null; dominio: string; link: string
 imagem: string | null; video: string | null; texto: string | null; n_ads: number; copias: number; dias_min: number
 dias_max: number; maior_anunciante: number; anunciantes: Anunciante[]; palavras: string[]; ads: string[]
 preco: number | null; pais: string; regra: { max_dias: number; min_anuncios_anunciante: number } | null
}

const libPagina = (id: string) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=${id}`
const libAnuncio = (id: string) => `https://www.facebook.com/ads/library/?id=${id}`
const corNota = (n: number) => n >= 70 ? '#34d399' : n >= 50 ? '#fbbf24' : '#94a3b8'

export default function VencedoresPage() {
 const [rows, setRows] = useState<Vencedor[]>([])
 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState('')
 const [busca, setBusca] = useState('')
 const [filtro, setFiltro] = useState<'todos' | 'fortes' | 'frescos' | 'shopify'>('todos')
 const [aberto, setAberto] = useState<string | null>(null)

 useEffect(() => {
  supabase.from('mm_meta_ranking_atual').select('*').order('nota', { ascending: false }).limit(300)
   .then(({ data, error }) => { if (error) setErro(error.message); setRows((data as Vencedor[]) || []); setLoading(false) })
 }, [])

 const lista = useMemo(() => rows.filter(r => {
  const t = `${r.titulo} ${r.dominio} ${r.texto} ${(r.anunciantes || []).map(a => a.nome).join(' ')} ${(r.palavras || []).join(' ')}`.toLowerCase()
  if (busca && !t.includes(busca.toLowerCase())) return false
  if (filtro === 'fortes') return r.nota >= 60
  if (filtro === 'frescos') return r.dias_min <= 30
  if (filtro === 'shopify') return /\/products\//.test(r.link || '')
  return true
 }), [rows, busca, filtro])

 const regra = rows[0]?.regra
 const anunciantes = new Set(rows.flatMap(r => (r.anunciantes || []).map(a => a.page_id))).size
 const kpis: [string, string | number, typeof filtro][] = [
  ['Produtos aprovados', rows.length, 'todos'],
  ['Nota 60+', rows.filter(r => r.nota >= 60).length, 'fortes'],
  ['Começaram há ≤30 dias', rows.filter(r => r.dias_min <= 30).length, 'frescos'],
  ['Página de produto Shopify', rows.filter(r => /\/products\//.test(r.link || '')).length, 'shopify'],
 ]

 return <div className="mm-fade-in">
  <div className="mm-page-header">
   <h1 className="mm-page-title">Vencedores Meta · produtos físicos escalando agora</h1>
   <p className="mm-page-subtitle">
    Fonte: Biblioteca de Anúncios da Meta (EUA), coleta diária automática. Regra: anúncio ativo há no máximo {regra?.max_dias ?? 90} dias
    + anunciante com {regra?.min_anuncios_anunciante ?? 50}+ anúncios ativos. Sem produto digital e sem suplemento.
    {rows[0] && <> Última coleta: <b>{new Date(rows[0].data + 'T12:00:00').toLocaleDateString('pt-BR')}</b> · {anunciantes} anunciantes.</>}
   </p>
  </div>

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10, marginBottom: 16 }}>
   {kpis.map(([rotulo, valor, f]) => <button key={rotulo} onClick={() => setFiltro(filtro === f ? 'todos' : f)} className="mm-card"
    style={{ padding: 14, textAlign: 'left', cursor: 'pointer', border: filtro === f ? '1px solid var(--purple)' : undefined }}>
    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--purple3)' }}>{valor}</div>
    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', marginTop: 4 }}>{rotulo}</div>
   </button>)}
  </div>

  <input className="mm-search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto, loja, anunciante ou palavra-chave..." style={{ width: '100%', maxWidth: 520, marginBottom: 16 }} />

  {erro && <div style={{ padding: 12, border: '1px solid rgba(251,113,133,.4)', borderRadius: 8, color: '#fb7185', marginBottom: 14 }}>Erro: {erro}</div>}
  {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Carregando vencedores...</div>}
  {!loading && !lista.length && <div className="mm-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Nenhum produto nesta seleção. A coleta roda todo dia de madrugada.</div>}

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
   {lista.map((r, i) => {
    const an = [...(r.anunciantes || [])].sort((a, b) => b.anuncios_ativos - a.anuncios_ativos)
    const exp = aberto === r.chave
    return <div key={r.chave} className="mm-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
     <div style={{ position: 'relative', background: '#0b1220', aspectRatio: '16/10' }}>
      {r.video ? <video src={r.video} poster={r.imagem || undefined} controls preload="none" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
       : r.imagem ? <img src={r.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text3)' }}>sem imagem</div>}
      <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.75)', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 800 }}>#{i + 1}</span>
      <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.75)', color: corNota(r.nota), borderRadius: 6, padding: '2px 8px', fontSize: 14, fontWeight: 900 }}>{Number(r.nota).toFixed(0)}</span>
     </div>
     <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <b style={{ fontSize: 15, lineHeight: 1.3 }}>{r.titulo || r.dominio}</b>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.dominio}{r.preco ? <> · <b style={{ color: '#34d399' }}>US$ {Number(r.preco).toFixed(2)}</b></> : null}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, fontSize: 11 }}>
       {[['Anúncios do anunciante', an[0]?.anuncios_ativos?.toLocaleString('pt-BR')], ['Anúncios novos achados', r.n_ads], ['Dias no ar', r.dias_min === r.dias_max ? r.dias_min : `${r.dias_min}–${r.dias_max}`]].map(([a, b]) =>
        <div key={String(a)} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: '6px 8px' }}>
         <div style={{ fontSize: 16, fontWeight: 800 }}>{b}</div><div style={{ color: 'var(--text3)' }}>{a}</div></div>)}
      </div>
      <div style={{ fontSize: 12 }}>Anunciante: {an.map(a => <a key={a.page_id} href={libPagina(a.page_id)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginRight: 8 }}>{a.nome} ↗</a>)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(r.palavras || []).map(p => <span key={p} style={{ fontSize: 10, border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '1px 7px', color: 'var(--text3)' }}>{p}</span>)}</div>
      {r.texto && <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{exp ? r.texto : r.texto.slice(0, 160) + (r.texto.length > 160 ? '…' : '')}</div>}
      {exp && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Cópias do criativo: {r.copias} · Anúncios: {(r.ads || []).map(id => <a key={id} href={libAnuncio(id)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginRight: 6 }}>{id}</a>)}</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
       <a href={r.link} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', background: 'var(--purple)', color: '#fff', borderRadius: 8, padding: '8px 0', fontWeight: 800, fontSize: 12 }}>VER LOJA ↗</a>
       {r.ads?.[0] && <a href={libAnuncio(r.ads[0])} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: 'center', border: '1px solid var(--purple)', color: 'var(--purple3)', borderRadius: 8, padding: '8px 0', fontWeight: 800, fontSize: 12 }}>VER ANÚNCIO ↗</a>}
       <button onClick={() => setAberto(exp ? null : r.chave)} style={{ border: '1px solid rgba(255,255,255,.15)', background: 'transparent', color: 'var(--text2)', borderRadius: 8, padding: '8px 10px', fontSize: 12, cursor: 'pointer' }}>{exp ? 'menos' : 'detalhes'}</button>
      </div>
     </div>
    </div>
   })}
  </div>
 </div>
}

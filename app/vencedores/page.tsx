'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Anunciante = { page_id: string; nome: string; anuncios_ativos: number }
type ProdLoja = { titulo: string; handle: string; preco: number | null; criado_em: string; dias: number | null; imagem: string }
type Loja = { host: string; total_produtos: number; catalogo_completo: boolean; novos_30d: number; novos: ProdLoja[] }
type Sinais = { historico_desde: string | null; cresc_anunciante_pct: number | null; base_data: string | null; novos_7d: number | null }
type Classe = 'PRODUTO VENCEDOR' | 'FORTE' | 'VALIDAR' | 'OBSERVAR'
type Item = {
 data: string; chave: string; nota: number; titulo: string | null; dominio: string; link: string
 imagem: string | null; video: string | null; texto: string | null; n_ads: number; copias: number; dias_min: number
 dias_max: number; maior_anunciante: number; anunciantes: Anunciante[]; palavras: string[]; ads: string[]
 preco: number | null; shopify: { loja?: Loja } | null; pais: string; regra: { max_dias: number; min_anuncios_anunciante: number } | null
 universos: string[]; sinais: Sinais | null; trend_pct: number | null; trend_termo: string | null
 ev_duplicacao: boolean; ev_aceleracao: boolean | null; ev_tendencia: boolean | null; ev_preco: boolean; ev_alcance: boolean
 evidencias: number; classe: Classe
}
type Dor = { termo: string; geo: string; universo: string | null; crescimento_pct: number | null; interesse_atual: number | null; interesse_medio: number | null; buscas_em_alta: { query: string; value: string }[] | null; coletado_em: string }

const CLASSES: Classe[] = ['PRODUTO VENCEDOR', 'FORTE', 'VALIDAR', 'OBSERVAR']
const COR: Record<Classe, string> = { 'PRODUTO VENCEDOR': '#34d399', FORTE: '#60a5fa', VALIDAR: '#fbbf24', OBSERVAR: '#94a3b8' }
const NC = 'NÃO CONFIRMADO'
const libPagina = (id: string, pais: string) => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${pais}&view_all_page_id=${id}`
const libAnuncio = (id: string) => `https://www.facebook.com/ads/library/?id=${id}`
const moeda = (pais: string) => pais === 'MX' ? 'MX$' : 'US$'
const curto = (u: string) => u.replace(/^U\d+\s/, '')
const dataBR = (d?: string | null) => d ? new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : ''

function Ev({ ok, rotulo, valor }: { ok: boolean | null; rotulo: string; valor: string }) {
 const cor = ok === null ? 'var(--text3)' : ok ? '#34d399' : '#fb7185'
 return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
  <span style={{ color: 'var(--text2)' }}>{ok === null ? '◌' : ok ? '✔' : '✘'} {rotulo}</span>
  <b style={{ color: cor, textAlign: 'right' }}>{valor}</b>
 </div>
}

export default function RadarPage() {
 const [rows, setRows] = useState<Item[]>([])
 const [dores, setDores] = useState<Dor[]>([])
 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState('')
 const [pais, setPais] = useState<'US' | 'MX'>('US')
 const [busca, setBusca] = useState('')
 const [classe, setClasse] = useState<Classe | 'todas' | 'lancando'>('todas')
 const [universo, setUniverso] = useState('')
 const [aberto, setAberto] = useState<string | null>(null)

 useEffect(() => {
  Promise.all([
   supabase.from('mm_radar_atual').select('*').order('nota', { ascending: false }).limit(1000),
   supabase.from('mm_dor_trends_atual').select('*').limit(1000),
  ]).then(([r, d]) => {
   if (r.error) setErro(r.error.message)
   setRows((r.data as Item[]) || []); setDores((d.data as Dor[]) || []); setLoading(false)
  })
 }, [])

 const doPais = useMemo(() => rows.filter(r => r.pais === pais), [rows, pais])
 const universosPais = useMemo(() => [...new Set(doPais.flatMap(r => r.universos || []))].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))), [doPais])
 const lista = useMemo(() => doPais.filter(r => {
  const t = `${r.titulo} ${r.dominio} ${r.texto} ${(r.anunciantes || []).map(a => a.nome).join(' ')} ${(r.palavras || []).join(' ')}`.toLowerCase()
  if (busca && !t.includes(busca.toLowerCase())) return false
  if (universo && !(r.universos || []).includes(universo)) return false
  if (classe === 'lancando') return (r.shopify?.loja?.novos_30d || 0) > 0
  if (classe !== 'todas') return r.classe === classe
  return true
 }), [doPais, busca, universo, classe])

 const doresPais = useMemo(() => dores.filter(d => d.geo === pais && d.crescimento_pct !== null && (d.interesse_medio ?? 0) >= 10)
  .sort((a, b) => (b.crescimento_pct || 0) - (a.crescimento_pct || 0)), [dores, pais])
 const emAlta = useMemo(() => {
  const m = new Map<string, string>()
  dores.filter(d => d.geo === pais).forEach(d => (d.buscas_em_alta || []).forEach(q => { if (!m.has(q.query)) m.set(q.query, d.termo) }))
  return [...m.entries()].slice(0, 30)
 }, [dores, pais])

 const regra = doPais[0]?.regra
 const ultima = doPais[0]?.data
 const kpis: [string, number, typeof classe, string][] = [
  ...CLASSES.map(c => [c, doPais.filter(r => r.classe === c).length, c, COR[c]] as [string, number, typeof classe, string]),
  ['Loja lançando produto (30d)', doPais.filter(r => (r.shopify?.loja?.novos_30d || 0) > 0).length, 'lancando', '#c084fc'],
 ]

 return <div className="mm-fade-in">
  <div className="mm-page-header">
   <h1 className="mm-page-title">Radar MM · produtos físicos de Saúde, Beleza e Bem-estar</h1>
   <p className="mm-page-subtitle">
    Método MM: dor → anúncios escalando → tendência → produto. Fonte principal: Biblioteca de Anúncios da Meta (coleta diária, rodízio de dores
    a cada 3 dias) + Google Trends da dor + catálogo da loja. Regra de entrada: anúncio ativo há até {regra?.max_dias ?? 90} dias e anunciante com
    {' '}{regra?.min_anuncios_anunciante ?? 50}+ anúncios ativos. Sem digital, suplemento ou nicho fora do escopo.
    {ultima && <> Última coleta {pais}: <b>{dataBR(ultima)}</b>.</>} Nenhum número é estimado: o que não foi medido aparece como <b>{NC}</b>.
   </p>
  </div>

  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
   {(['US', 'MX'] as const).map(p => <button key={p} onClick={() => { setPais(p); setUniverso(''); setClasse('todas') }} className="mm-card"
    style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: 800, border: pais === p ? '1px solid var(--purple)' : undefined, color: pais === p ? 'var(--purple3)' : 'var(--text2)' }}>
    {p === 'US' ? 'Estados Unidos (principal)' : 'México (secundário)'} · {rows.filter(r => r.pais === p).length}
   </button>)}
  </div>

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 14 }}>
   {kpis.map(([rotulo, valor, f, cor]) => <button key={rotulo} onClick={() => setClasse(classe === f ? 'todas' : f)} className="mm-card"
    style={{ padding: 14, textAlign: 'left', cursor: 'pointer', border: classe === f ? `1px solid ${cor}` : undefined }}>
    <div style={{ fontSize: 26, fontWeight: 800, color: cor }}>{valor}</div>
    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', marginTop: 4 }}>{rotulo}</div>
   </button>)}
  </div>

  {!!universosPais.length && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
   {universosPais.map(u => <button key={u} onClick={() => setUniverso(universo === u ? '' : u)}
    style={{ fontSize: 12, borderRadius: 14, padding: '4px 10px', cursor: 'pointer', background: universo === u ? 'var(--purple)' : 'transparent', color: universo === u ? '#fff' : 'var(--text2)', border: '1px solid rgba(255,255,255,.18)' }}>
    {u} · {doPais.filter(r => (r.universos || []).includes(u)).length}</button>)}
  </div>}

  <input className="mm-search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto, loja, anunciante ou dor..." style={{ width: '100%', maxWidth: 520, marginBottom: 16 }} />

  {erro && <div style={{ padding: 12, border: '1px solid rgba(251,113,133,.4)', borderRadius: 8, color: '#fb7185', marginBottom: 14 }}>Erro: {erro}</div>}
  {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Carregando radar...</div>}

  {!loading && <details className="mm-card" style={{ padding: 14, marginBottom: 16 }}>
   <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Dores crescendo agora — Google Trends {pais} ({doresPais.length} dores com volume suficiente) e buscas novas em alta</summary>
   <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Crescimento = média do último mês vs primeiro mês (3 meses). Dores com interesse médio abaixo de 10 ficam de fora: volume baixo demais para confirmar tendência.</div>
   {!doresPais.length && <div style={{ color: 'var(--text3)', fontSize: 13, marginTop: 8 }}>Ainda sem medição das dores deste país. O Google Trends roda todo dia e mede cada dor a cada 6 dias.</div>}
   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 6, marginTop: 10 }}>
    {doresPais.slice(0, 40).map(d => <div key={d.termo} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: '5px 8px' }}>
     <span>{d.termo}{d.universo && <span style={{ color: 'var(--text3)' }}> · {curto(d.universo)}</span>}</span>
     <b style={{ color: (d.crescimento_pct || 0) > 0 ? '#34d399' : '#fb7185' }}>{(d.crescimento_pct || 0) > 0 ? '+' : ''}{Number(d.crescimento_pct).toFixed(0)}%</b>
    </div>)}
   </div>
   {!!emAlta.length && <>
    <div style={{ fontSize: 12, color: 'var(--text3)', margin: '12px 0 6px' }}>Buscas novas em alta (possíveis dores novas para investigar):</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{emAlta.map(([q, origem]) =>
     <span key={q} title={`apareceu junto de "${origem}"`} style={{ fontSize: 11, border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '2px 8px', color: 'var(--text2)' }}>{q}</span>)}</div>
   </>}
  </details>}

  {!loading && !lista.length && <div className="mm-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Nenhum produto nesta seleção. A coleta roda todo dia de madrugada.</div>}

  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
   {lista.map((r, i) => {
    const an = [...(r.anunciantes || [])].sort((a, b) => b.anuncios_ativos - a.anuncios_ativos)
    const exp = aberto === r.chave
    const s = r.sinais
    const loja = r.shopify?.loja
    const acel = s?.cresc_anunciante_pct != null ? `${s.cresc_anunciante_pct > 0 ? '+' : ''}${s.cresc_anunciante_pct}% desde ${dataBR(s.base_data)}`
     : s?.novos_7d != null ? `${s.novos_7d} anúncios novos em 7 dias` : `${NC} (histórico desde ${dataBR(s?.historico_desde) || 'hoje'})`
    return <div key={r.chave} className="mm-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
     <div style={{ position: 'relative', background: '#0b1220', aspectRatio: '16/10' }}>
      {r.video ? <video src={r.video} poster={r.imagem || undefined} controls preload="none" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
       : r.imagem ? <img src={r.imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text3)' }}>sem imagem</div>}
      <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.8)', color: COR[r.classe], borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>#{i + 1} · {r.classe}</span>
      <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.8)', color: COR[r.classe], borderRadius: 6, padding: '2px 8px', fontSize: 14, fontWeight: 900 }}>{Number(r.nota).toFixed(0)}</span>
     </div>
     <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
      <b style={{ fontSize: 15, lineHeight: 1.3 }}>{r.titulo || r.dominio}</b>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{r.dominio}{(r.universos || []).length ? ` · ${(r.universos || []).map(curto).join(', ')}` : ''}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, fontSize: 11 }}>
       {[['Anúncios do anunciante', an[0]?.anuncios_ativos?.toLocaleString('pt-BR')], ['Anúncios novos achados', r.n_ads], ['Dias no ar', r.dias_min === r.dias_max ? r.dias_min : `${r.dias_min}–${r.dias_max}`]].map(([a, b]) =>
        <div key={String(a)} style={{ background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: '6px 8px' }}>
         <div style={{ fontSize: 16, fontWeight: 800 }}>{b}</div><div style={{ color: 'var(--text3)' }}>{a}</div></div>)}
      </div>
      <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '6px 10px' }}>
       <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Evidências ({r.evidencias}/5)</div>
       <Ev ok={true} rotulo="Anunciante escalando" valor={`${an[0]?.anuncios_ativos ?? '-'} anúncios ativos`} />
       <Ev ok={r.ev_aceleracao} rotulo="Aceleração" valor={acel} />
       <Ev ok={r.ev_tendencia} rotulo="Tendência da dor (Google)" valor={r.trend_pct != null ? `${r.trend_pct > 0 ? '+' : ''}${Number(r.trend_pct).toFixed(0)}% · ${r.trend_termo}` : NC} />
       <Ev ok={r.ev_duplicacao} rotulo="Criativo duplicado / vários anúncios" valor={`${r.copias} cópias · ${r.n_ads} anúncios`} />
       <Ev ok={r.ev_alcance} rotulo="Mais de um anunciante ou dor" valor={`${an.length} anunciante(s) · ${(r.palavras || []).length} dor(es)`} />
       <Ev ok={r.ev_preco} rotulo="Preço de venda" valor={r.preco ? `${moeda(r.pais)} ${Number(r.preco).toFixed(2)}` : NC} />
       <Ev ok={null} rotulo="Fornecedor · custo · margem · logística" valor={NC} />
      </div>
      {loja && <div style={{ fontSize: 12, color: 'var(--text2)' }}>
       Loja: <b>{loja.total_produtos}{loja.catalogo_completo ? '' : '+'}</b> produtos ·{' '}
       <b style={{ color: loja.novos_30d ? '#fbbf24' : 'var(--text3)' }}>{loja.novos_30d} lançados em 30 dias</b>
      </div>}
      <div style={{ fontSize: 12 }}>Anunciante: {an.map(a => <a key={a.page_id} href={libPagina(a.page_id, r.pais)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginRight: 8 }}>{a.nome} ↗</a>)}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{(r.palavras || []).map(p => <span key={p} style={{ fontSize: 10, border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '1px 7px', color: 'var(--text3)' }}>{p}</span>)}</div>
      {r.texto && <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{exp ? r.texto : r.texto.slice(0, 160) + (r.texto.length > 160 ? '…' : '')}</div>}
      {exp && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Anúncios: {(r.ads || []).map(id => <a key={id} href={libAnuncio(id)} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginRight: 6 }}>{id}</a>)}</div>}
      {exp && !!loja?.novos?.length && <div style={{ fontSize: 11 }}>
       <div style={{ color: 'var(--text3)', marginBottom: 4 }}>Últimos lançamentos da loja (o que ela está testando agora):</div>
       {loja.novos.map(n => <a key={n.handle} href={`https://${loja.host}/products/${n.handle}`} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text2)', padding: '3px 0' }}>
        {n.imagem && <img src={n.imagem} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />}
        <span style={{ flex: 1 }}>{n.titulo}</span>
        <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{n.preco ? `${moeda(r.pais)} ${n.preco.toFixed(2)} · ` : ''}há {n.dias}d</span>
       </a>)}
      </div>}
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

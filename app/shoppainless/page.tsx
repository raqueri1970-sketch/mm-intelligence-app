'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee/shopee.module.css'

type Top = { id: string; name: string; score_final: number | null; timing: string | null; niche: string | null }
type Source = { label: string; table: string; col: string; href: string; desc: string }
type Fresh = { last: string | null; count: number | null; error?: string }

// Cada fonte de dados do ShopPainless e a coluna que diz quando foi atualizada.
const SOURCES: Source[] = [
  { label: 'Ranking de produtos', table: 'ranking_view', col: 'created_at', href: '/produtos', desc: 'Produtos minerados com score final' },
  { label: 'Radar MM (anúncios)', table: 'mm_radar_atual', col: 'data', href: '/vencedores', desc: 'Anúncios e sinais de saúde/beleza' },
  { label: 'Agentes especialistas (Scout)', table: 'mm_specialist_scout_results', col: 'created_at', href: '/radar', desc: 'Varredura diária por dor/nicho' },
]

const TOOLS = [
  { href: '/vencedores', title: 'Radar MM', desc: 'Produtos físicos de Saúde, Beleza e Bem-estar com sinais de anúncio.' },
  { href: '/produtos', title: 'Produtos', desc: 'Ranking minerado: score, timing, CPA ideal e margem.' },
  { href: '/radar', title: 'Conselho MM', desc: 'O que os agentes especialistas recomendam.' },
  { href: '/analise', title: 'Pré-análise', desc: 'Dor + caçador de criativos para um produto.' },
  { href: '/concorrentes', title: 'Concorrentes', desc: 'Lojas monitoradas e anúncios ativos.' },
  { href: '/analytics', title: 'Analytics', desc: 'Distribuição de scores e nichos.' },
]

function age(iso: string | null) {
  if (!iso) return { text: 'sem dados', stale: true }
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return { text: days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`, stale: days > 2 }
}

export default function ShopPainlessPage() {
  const [top, setTop] = useState<Top[]>([])
  const [fresh, setFresh] = useState<Record<string, Fresh>>({})

  useEffect(() => {
    supabase.from('ranking_view').select('id,name,score_final,timing,niche').order('score_final', { ascending: false, nullsFirst: false }).limit(8)
      .then(({ data }) => setTop((data as Top[]) ?? []))
    SOURCES.forEach(async src => {
      const [{ data, error }, { count }] = await Promise.all([
        supabase.from(src.table).select(src.col).order(src.col, { ascending: false, nullsFirst: false }).limit(1),
        supabase.from(src.table).select('*', { count: 'exact', head: true }),
      ])
      const row = data?.[0] as Record<string, string> | undefined
      setFresh(f => ({ ...f, [src.table]: { last: row?.[src.col] ?? null, count: count ?? null, error: error?.message } }))
    })
  }, [])

  const stale = SOURCES.filter(src => fresh[src.table] && age(fresh[src.table].last).stale)

  return (
    <div className={s.page}>
      <div className={s.head}><h1>ShopPainless — Descoberta de produtos</h1><p>Dropshipping de saúde e beleza para EUA, México e Espanha. Aqui fica tudo o que os agentes do MM encontram — separado do Shopee Afiliado.</p></div>

      <div className={s.stats}>
        <div className={s.stat}><span>Produtos no ranking</span><strong>{fresh.ranking_view?.count ?? '…'}</strong><small>score final calculado</small></div>
        <div className={s.stat}><span>Sinais no Radar</span><strong>{fresh.mm_radar_atual?.count ?? '…'}</strong><small>anúncios e tendências</small></div>
        <div className={s.stat}><span>Fontes atrasadas</span><strong style={{ color: stale.length ? '#fbbf24' : '#34d399' }}>{Object.keys(fresh).length < SOURCES.length ? '…' : stale.length}</strong><small>{stale.length ? 'veja abaixo' : 'tudo em dia'}</small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Saúde dos dados</h2><p>Quando cada fonte foi atualizada pela última vez. Mais de 2 dias sem atualizar = agente provavelmente parado.</p></div></div>
        <div className={s.jobs}>{SOURCES.map(src => {
          const f = fresh[src.table]; const a = age(f?.last ?? null)
          return (
            <div key={src.table} className={s.job} style={{ gridTemplateColumns: '1fr auto auto', alignItems: 'center' }}>
              <span><b>{src.label}</b><small style={{ display: 'block', color: 'var(--text3)' }}>{src.desc}</small></span>
              <span className={!f ? s.wait : f.error ? s.err : a.stale ? s.wait : s.ok}>{!f ? '…' : f.error ? 'sem acesso' : `${a.stale ? '⚠ ' : '✓ '}${f.last ? `atualizado ${a.text}` : 'nenhum dado visível para o painel'}`}{f?.last && <small style={{ display: 'block', color: 'var(--text3)' }}>{new Date(f.last).toLocaleString('pt-BR')}</small>}</span>
              <Link className={`${s.btn} ${s.btnGhost}`} href={src.href}>ABRIR</Link>
            </div>
          )
        })}</div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Top produtos agora</h2><p>Maiores scores do ranking minerado.</p></div><Link className={s.btn} href="/produtos">VER TODOS →</Link></div>
        {top.length === 0 ? <p className={s.hint}>Carregando…</p> : (
          <div className={s.list}>{top.map((p, i) => (
            <Link key={p.id} href={`/produtos/${p.id}`} className={s.item} style={{ textDecoration: 'none', color: 'var(--text)', gridTemplateColumns: '44px minmax(0,1fr) 90px 90px' }}>
              <b className={s.rank}>#{i + 1}</b>
              <div><b>{p.name}</b><small>{p.niche ?? '—'}</small></div>
              <div className={s.views}><b>{p.score_final ?? '—'}</b><span>score</span></div>
              <span className={s.badge} style={{ justifySelf: 'start' }}>{p.timing ?? '—'}</span>
            </Link>
          ))}</div>
        )}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Ferramentas de descoberta</h2></div></div>
        <div className={s.cards}>{TOOLS.map(t => <Link key={t.href} href={t.href} className={s.card}><span>SHOPPAINLESS</span><br /><b>{t.title}</b><p>{t.desc}</p></Link>)}</div>
      </section>
    </div>
  )
}

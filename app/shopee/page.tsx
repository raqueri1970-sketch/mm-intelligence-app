'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import s from './shopee.module.css'
import { ShopeeTabs, VERIFIED_AT, isVideoPage, unlinkedRefs, useHooks, videos, type RadarVideo } from './shared'

const toCriativos = (urls: string[]) => `/shopee/criativos?links=${encodeURIComponent(urls.join('\n'))}`
const fmt = (n: number) => n.toLocaleString('pt-BR')

type Check = { status: 'wait' | 'ok' | 'err'; views?: number; msg?: string }

export default function ShopeeRadarPage() {
  const { hooks } = useHooks()
  const [checks, setChecks] = useState<Record<string, Check>>({})
  const [checking, setChecking] = useState(false)
  const [checkedAt, setCheckedAt] = useState('')

  const list = useMemo(() => videos
    .map(v => ({ ...v, views: checks[v.id]?.views ?? v.views }))
    .sort((a, b) => b.views - a.views), [checks])
  const downloadable = list.filter(v => isVideoPage(v.url) && checks[v.id]?.status !== 'err').map(v => v.url)
  const tiktok = list.filter(v => v.source === 'TikTok')
  const top = list[0]

  async function verifyAll() {
    setChecking(true)
    setChecks(Object.fromEntries(videos.map(v => [v.id, { status: 'wait' as const }])))
    await Promise.all(videos.map(async (v: RadarVideo) => {
      try {
        const r = await fetch(`/api/video/download?info=1&url=${encodeURIComponent(v.url)}`)
        const j = await r.json()
        setChecks(c => ({ ...c, [v.id]: r.ok ? { status: 'ok', views: j.views } : { status: 'err', msg: j.error } }))
      } catch { setChecks(c => ({ ...c, [v.id]: { status: 'err', msg: 'sem resposta' } })) }
    }))
    setCheckedAt(new Date().toLocaleString('pt-BR'))
    setChecking(false)
  }

  const okCount = Object.values(checks).filter(c => c.status === 'ok').length
  const errCount = Object.values(checks).filter(c => c.status === 'err').length

  return (
    <div className={s.page}>
      <div className={s.head}><h1>Shopee — Radar de Vídeos Vencedores</h1><p>Só vídeos com link real e visualizações lidas na própria página. Estude o gancho, mande para Criativos e monte suas versões.</p></div>
      <ShopeeTabs />
      <div className={s.stats}>
        <div className={s.stat}><span>Produto</span><strong>Hidrabene</strong><small>Protetor facial FPS 70</small></div>
        <div className={s.stat}><span>Maior vídeo verificado</span><strong>{fmt(top.views)}</strong><small>{top.source}</small></div>
        <div className={s.stat}><span>Vídeos com link</span><strong>{videos.length}</strong><small>{videos.length - tiktok.length} Mercado Livre · {tiktok.length} TikTok</small></div>
        <div className={s.stat}><span>Conta da marca</span><strong>234,2 mil</strong><small>seguidores · @hidrabene · 872 vídeos</small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div><h2>TOP {list.length} — vídeos do produto</h2><p>{checkedAt ? `Verificado agora (${checkedAt}): ${okCount} ok${errCount ? `, ${errCount} com problema` : ''}.` : `Última verificação: ${VERIFIED_AT}. Clique em Verificar para atualizar views e testar cada link.`}</p></div>
          <div className={s.row}>
            <button className={`${s.btn} ${s.btnGhost}`} onClick={verifyAll} disabled={checking}>{checking ? 'VERIFICANDO...' : 'VERIFICAR AGORA ↻'}</button>
            <Link className={s.btn} href={toCriativos(downloadable)}>ENVIAR TODOS PARA CRIATIVOS →</Link>
          </div>
        </div>
        <div className={s.list}>{list.map((v, i) => {
          const c = checks[v.id]
          return (
            <div key={v.id} className={s.item}>
              <b className={s.rank}>#{i + 1}</b>
              <div><b>{v.title}</b><small>{v.source} • Gancho: {v.hook}</small><small>{v.why}</small>
                {c && <small className={s[c.status]}>{c.status === 'wait' ? '… verificando' : c.status === 'ok' ? '✓ link ok, vídeo encontrado' : `✕ ${c.msg}`}</small>}
              </div>
              <div className={s.views}><b>{fmt(v.views)}</b><span>visualizações</span></div>
              <div className={s.actions}>
                <a className={`${s.btn} ${s.btnGhost}`} href={v.url} target="_blank" rel="noopener noreferrer">ABRIR ↗</a>
                {isVideoPage(v.url) && <Link className={s.btn} href={toCriativos([v.url])}>BAIXAR ↓</Link>}
              </div>
            </div>
          )
        })}</div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Referências sem link</h2><p>Números citados por terceiros. Não dá para abrir o vídeo nem conferir — servem só de contexto e ficam fora do ranking.</p></div></div>
        <div className={s.jobs}>{unlinkedRefs.map(r => <div key={r.label} className={s.job}><span><b>{r.label}:</b> {r.value}</span><a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text3)' }}>{r.source} ↗</a></div>)}</div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Ganchos escolhidos pelo radar</h2><p>Edite em Criativos — a mesma lista vale para o Remix e o Sub ID.</p></div><Link className={`${s.btn} ${s.btnGhost}`} href="/shopee/criativos#ganchos">EDITAR GANCHOS</Link></div>
        <div className={s.jobs}>{hooks.map((h, i) => <div key={h + i} className={s.job} style={{ gridTemplateColumns: '1fr' }}><b style={{ fontSize: 14 }}>g{i + 1}. {h}</b></div>)}</div>
      </section>

      <section className={s.panel}><h2 style={{ fontSize: 18 }}>Regra de compliance</h2><p className={s.hint} style={{ fontSize: 13, color: 'var(--text2)' }}>Bloquear no texto publicitário: “clareamento”, “clareia”, “clareador”, cura de melasma, proteção 100% e promessa de não reaplicar. Vários vídeos de referência usam esses termos — copie o formato, nunca o texto.</p></section>
    </div>
  )
}

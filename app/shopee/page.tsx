'use client'
import Link from 'next/link'
import s from './shopee.module.css'
import { ShopeeTabs, isVideoPage, useHooks, videos } from './shared'

const toCriativos = (urls: string[]) => `/shopee/criativos?links=${encodeURIComponent(urls.join('\n'))}`

export default function ShopeeRadarPage() {
  const { hooks } = useHooks()
  const downloadable = videos.filter(v => isVideoPage(v.url)).map(v => v.url)
  return (
    <div className={s.page}>
      <div className={s.head}><h1>Shopee — Radar de Vídeos Vencedores</h1><p>Os vídeos que mais performam do produto em análise. Estude o gancho, mande para Criativos e monte suas versões.</p></div>
      <ShopeeTabs />
      <div className={s.stats}>
        <div className={s.stat}><span>Produto</span><strong>Hidrabene</strong><small>FPS 70</small></div>
        <div className={s.stat}><span>TikTok produto</span><strong>30,88 mi</strong><small>views agregadas estimadas</small></div>
        <div className={s.stat}><span>Vídeos mapeados</span><strong>4.080</strong><small>TokDataPRO</small></div>
        <div className={s.stat}><span>Saturação</span><strong>88/100</strong><small>precisa diferenciar gancho</small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div><h2>TOP 10 — vídeos do produto</h2><p>Ordenados pelos melhores sinais públicos verificados. Abra para estudar gancho, cena e ritmo.</p></div>
          <Link className={s.btn} href={toCriativos(downloadable)}>ENVIAR TODOS PARA CRIATIVOS →</Link>
        </div>
        <div className={s.list}>{videos.map(v => (
          <div key={v.rank} className={s.item}>
            <b className={s.rank}>#{v.rank}</b>
            <div><b>{v.title}</b><small>{v.source} • Gancho: {v.hook}</small><small>{v.why}</small></div>
            <div className={s.views}><b>{v.views}</b><span>visualizações</span></div>
            <div className={s.actions}>
              <a className={`${s.btn} ${s.btnGhost}`} href={v.url} target="_blank" rel="noopener noreferrer">ABRIR ↗</a>
              {isVideoPage(v.url) && <Link className={s.btn} href={toCriativos([v.url])}>BAIXAR ↓</Link>}
            </div>
          </div>
        ))}</div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Ganchos escolhidos pelo radar</h2><p>Edite em Criativos — a mesma lista vale para o Remix e o Sub ID.</p></div><Link className={`${s.btn} ${s.btnGhost}`} href="/shopee/criativos#ganchos">EDITAR GANCHOS</Link></div>
        <div className={s.jobs}>{hooks.map((h, i) => <div key={h + i} className={s.job} style={{ gridTemplateColumns: '1fr' }}><b style={{ fontSize: 14 }}>g{i + 1}. {h}</b></div>)}</div>
      </section>

      <section className={s.panel}><h2 style={{ fontSize: 18 }}>Regra de compliance</h2><p className={s.hint} style={{ fontSize: 13, color: 'var(--text2)' }}>Bloquear no texto publicitário: “clareamento”, “clareia”, “clareador”, cura de melasma, proteção 100% e promessa de não reaplicar.</p></section>
    </div>
  )
}

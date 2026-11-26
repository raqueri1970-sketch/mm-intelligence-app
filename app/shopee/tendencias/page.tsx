'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee.module.css'
import { LastRun } from '../DailyRanking'
import { ShopeeTabs, brl } from '../shared'
import OfferCard, { fromRow, type OfferItem } from '../OfferCard'

// Em alta: o que as pessoas estão digitando no Google, YouTube e Amazon (e o Google Trends do dia),
// conferido na Shopee. Só aparece aqui o termo que tem produto de verdade vendendo e pagando comissão.

type Term = {
  keyword: string; term: string; sources: string[]; seeds: string[]; heat: number; traffic: string | null; niche: string | null
  shopee_sales: number | null; good_items: number | null; best_commission: number | null; relevance: number | null
  top_item: { name: string; image: string; price: number; sales: number; commission: number; commissionRate: number } | null
  verdict: string; first_seen: string; last_seen: string
}
type Filter = 'all' | 'casa' | 'outros'
type Sort = 'heat' | 'sales' | 'commission' | 'new'

const SRC: Record<string, { label: string; color: string }> = {
  google: { label: 'Google', color: '#60a5fa' },
  youtube: { label: 'YouTube', color: '#f87171' },
  amazon: { label: 'Amazon', color: '#fbbf24' },
  trends: { label: 'Google Trends', color: '#34d399' },
}
const isNew = (t: Term) => Date.now() - new Date(t.first_seen).getTime() < 36 * 3600 * 1000

export default function TendenciasPage() {
  const [terms, setTerms] = useState<Term[]>([])
  const [weak, setWeak] = useState<Term[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('heat')
  const [open, setOpen] = useState<string | null>(null)
  const [offers, setOffers] = useState<Record<string, OfferItem[] | 'loading'>>({})

  useEffect(() => {
    const since = new Date(Date.now() - 3 * 86400000).toISOString()
    const cols = 'keyword,term,sources,seeds,heat,traffic,niche,shopee_sales,good_items,best_commission,relevance,top_item,verdict,first_seen,last_seen'
    Promise.all([
      supabase.from('mm_trend_terms').select(cols).eq('verdict', 'em_alta').gte('last_seen', since).order('heat', { ascending: false }).limit(200),
      supabase.from('mm_trend_terms').select(cols).eq('verdict', 'fraca').gte('last_seen', since).order('heat', { ascending: false }).limit(30),
      supabase.from('mm_trend_terms').select('keyword', { count: 'exact', head: true }).gte('last_seen', since),
    ]).then(([hot, fr, all]) => {
      setTerms((hot.data as Term[]) ?? []); setWeak((fr.data as Term[]) ?? []); setTotal(all.count ?? 0); setLoading(false)
    })
  }, [])

  const shown = useMemo(() => terms
    .filter(t => filter === 'all' || (filter === 'casa' ? t.niche === 'casa' : t.niche !== 'casa'))
    .sort((a, b) => sort === 'sales' ? Number(b.shopee_sales) - Number(a.shopee_sales)
      : sort === 'commission' ? Number(b.best_commission) - Number(a.best_commission)
      : sort === 'new' ? +new Date(b.first_seen) - +new Date(a.first_seen)
      : b.heat - a.heat), [terms, filter, sort])

  async function toggle(t: Term) {
    if (open === t.keyword) { setOpen(null); return }
    setOpen(t.keyword)
    if (offers[t.keyword]) return
    setOffers(o => ({ ...o, [t.keyword]: 'loading' }))
    const { data: last } = await supabase.from('mm_shopee_offers').select('run_date').eq('keyword', t.keyword).order('run_date', { ascending: false }).limit(1)
    const day = last?.[0]?.run_date
    const { data } = day ? await supabase.from('mm_shopee_offers')
      .select('item_id,keyword,name,price,sales,rating,commission_rate,commission,score,image,product_link,affiliate_link')
      .eq('keyword', t.keyword).eq('run_date', day).order('score', { ascending: false }).limit(12) : { data: [] }
    setOffers(o => ({ ...o, [t.keyword]: ((data ?? []) as Record<string, unknown>[]).map(fromRow) }))
  }

  const maxHeat = Math.max(1, ...terms.map(t => t.heat))
  const newCount = terms.filter(isNew).length

  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1>🔥 Em alta</h1>
        <p>O que as pessoas estão digitando agora no <b>Google</b>, no <b>YouTube</b> e na <b>Amazon</b>, mais as buscas do dia no <b>Google Trends</b>, conferido na Shopee. Só entra aqui o termo que tem produto vendendo e pagando comissão.</p>
      </div>
      <ShopeeTabs />

      <div className={s.stats}>
        <div className={s.stat} style={{ borderColor: 'rgba(249,115,22,.45)' }}><span>Termos em alta</span><strong>{terms.length}</strong><small>{newCount} novos nas últimas 36 h</small></div>
        <div className={s.stat}><span>Buscas analisadas</span><strong>{total}</strong><small>últimos 3 dias · 4 fontes</small></div>
        <div className={s.stat}><span>Como usar</span><strong style={{ fontSize: 16 }}>Abra um termo</strong><small>veja os produtos e copie o link com Sub ID <b>alta</b></small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div><h2>Buscas que viram venda</h2><p>Atualiza sozinho a cada 2 horas, das 07h40 às 19h40. Os termos de casa e decoração também entram na fila do Grupo VIP.</p></div>
          <span className={s.badge}>{shown.length} TERMOS</span>
        </div>
        <LastRun kinds={['trends']} />

        <div className={s.xBar}>
          <div className={s.seg} role="tablist" aria-label="Tipo">
            {([['all', 'Tudo'], ['casa', '🏠 Casa e Natal'], ['outros', '🎁 Presentes e outros']] as [Filter, string][]).map(([f, l]) => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? s.segOn : undefined} onClick={() => setFilter(f)}>{l}</button>
            ))}
          </div>
          <div className={s.chips} style={{ marginTop: 0 }}>
            {([['heat', '🔥 Mais buscados'], ['sales', 'Mais vendas'], ['commission', 'Maior comissão'], ['new', 'Novidades']] as [Sort, string][]).map(([k, l]) => (
              <button key={k} type="button" className={`${s.chip} ${sort === k ? s.chipOn : ''}`} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
        </div>

        {loading ? <p className={s.hint}>Carregando tendências…</p>
          : shown.length === 0 ? <p className={s.hint}>Ainda não há termos em alta. A descoberta roda a cada 2 horas, a partir das 07h40.</p>
          : <div className={s.tList}>{shown.map(t => (
            <div key={t.keyword} className={s.tItem}>
              <button type="button" className={s.tHead} onClick={() => toggle(t)} aria-expanded={open === t.keyword}>
                {t.top_item?.image ? <img className={s.tImg} src={t.top_item.image} alt="" loading="lazy" /> : <span className={s.tImg} />}
                <span className={s.tBody}>
                  <b className={s.tTerm}>{t.term}{isNew(t) && <span className={s.tNew}>NOVO</span>}</b>
                  <span className={s.tHeat}><i style={{ width: `${Math.max(8, Math.round(100 * t.heat / maxHeat))}%` }} /></span>
                  <span className={s.tSrc}>{t.sources.map(x => <span key={x} style={{ color: SRC[x]?.color, borderColor: SRC[x]?.color }}>{SRC[x]?.label ?? x}</span>)}{t.traffic && <span>{t.traffic} buscas</span>}</span>
                  <span className={s.tNums}>
                    <span>{Number(t.shopee_sales ?? 0).toLocaleString('pt-BR')} vendas no top 10</span>
                    {t.best_commission != null && <span className={s.ok}>até {brl(Number(t.best_commission))} por venda</span>}
                  </span>
                </span>
                <span className={s.tArrow} aria-hidden="true">{open === t.keyword ? '▴' : '▾'}</span>
              </button>
              {open === t.keyword && (
                offers[t.keyword] === 'loading' ? <p className={s.hint}>Carregando produtos…</p>
                  : (offers[t.keyword] as OfferItem[]).length === 0 ? <p className={s.hint}>Sem produtos salvos para este termo hoje.</p>
                  : <div className={s.xList} style={{ marginTop: 10 }}>{(offers[t.keyword] as OfferItem[]).map(it => <OfferCard key={it.item_id} it={it} sub="alta" emoji="🔥" />)}</div>
              )}
            </div>
          ))}</div>}
      </section>

      {weak.length > 0 && (
        <section className={s.panel}>
          <div className={s.panelHead}><div><h2>Buscado, mas fraco na Shopee</h2><p>As pessoas procuram, mas os produtos da Shopee não batem com o termo, vendem pouco ou pagam menos de 10%. Bom para ideia de conteúdo, não para link.</p></div></div>
          <div className={s.chips}>{weak.map(t => <span key={t.keyword} className={s.chip} title={`${Number(t.shopee_sales ?? 0).toLocaleString('pt-BR')} vendas no top 10`}>{t.term}</span>)}</div>
        </section>
      )}
    </div>
  )
}

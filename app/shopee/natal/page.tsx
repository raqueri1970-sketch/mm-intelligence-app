'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import s from '../shopee.module.css'
import { LastRun } from '../DailyRanking'
import { ShopeeTabs, brl, type Product } from '../shared'

// Achados de Natal: o que o minerador trouxe hoje (decoração e presentes) + busca ao vivo na Shopee.
// Cada link copiado já sai com o Sub ID "natal" para aparecer separado no relatório de comissões.

type Item = {
  item_id: number; keyword: string; name: string; price: number; sales: number; rating: number
  commission_rate: number; commission: number; score: number; image: string | null
  product_link: string | null; affiliate_link: string | null; group: 'decor' | 'gift' | 'busca'
}
type Group = 'all' | 'decor' | 'gift'
type Sort = 'score' | 'sales' | 'commission' | 'price'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'score', label: 'Melhor aposta' },
  { id: 'sales', label: 'Mais vendidos' },
  { id: 'commission', label: 'Maior comissão' },
  { id: 'price', label: 'Mais baratos' },
]
const XMAS = /natal|noel|natalin/i // decoração natalina de verdade (o resto da campanha são presentes)
const SUGGESTIONS = ['pisca pisca', 'árvore de natal', 'enfeite de natal', 'presépio', 'guirlanda', 'luz de fada', 'toalha de mesa natal', 'pijama natal família', 'kit ceia de natal', 'amigo secreto', 'gorro papai noel', 'cesta de natal']

function daysToXmas() {
  const now = new Date(Date.now() - 3 * 3600 * 1000) // horário de Brasília
  const y = now.getUTCFullYear()
  const today = Date.UTC(y, now.getUTCMonth(), now.getUTCDate())
  let xmas = Date.UTC(y, 11, 25)
  if (today > xmas) xmas = Date.UTC(y + 1, 11, 25)
  return Math.round((xmas - today) / 86400000)
}
const shortName = (n: string) => { const t = n.replace(/\s+/g, ' ').trim(); return t.length > 80 ? t.slice(0, 80).replace(/\s+\S*$/, '') + '…' : t }
const fromProduct = (p: Product, keyword: string): Item => ({
  item_id: p.id, keyword, name: p.name, price: p.price, sales: p.sales, rating: p.rating, commission_rate: p.commissionRate,
  commission: p.commission, score: p.score, image: p.image || null, product_link: p.productLink || null, affiliate_link: p.affiliateLink || null, group: 'busca',
})
function message(it: Item, link: string) {
  return [
    `🎄 *${shortName(it.name)}*`,
    `💰 *${brl(Number(it.price))}*`,
    `${it.rating >= 4 ? `⭐ ${Number(it.rating).toFixed(1).replace('.', ',')} · ` : ''}${Number(it.sales).toLocaleString('pt-BR')} vendidos`,
    ``,
    `👉 ${link}`,
    ``,
    `_Link de afiliado: posso ganhar comissão, sem custo a mais pra você. Preço e estoque podem mudar._`,
  ].join('\n')
}

export default function NatalPage() {
  const [items, setItems] = useState<Item[]>([])
  const [day, setDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<Group>('decor')
  const [sort, setSort] = useState<Sort>('score')
  const [onlyGood, setOnlyGood] = useState(true)
  const [filter, setFilter] = useState('')
  const [q, setQ] = useState('')
  const [live, setLive] = useState<Item[]>([])
  const [liveMsg, setLiveMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [links, setLinks] = useState<Record<number, string>>({})
  const [working, setWorking] = useState<number>()
  const [done, setDone] = useState<{ id: number; what: string }>()

  useEffect(() => {
    (async () => {
      const { data: kws } = await supabase.from('mm_shopee_keywords').select('keyword,niche').eq('campaign', 'natal').eq('active', true)
      const list = (kws ?? []) as { keyword: string; niche: string | null }[]
      if (!list.length) { setLoading(false); return }
      const niche = new Map(list.map(k => [k.keyword, k.niche]))
      const { data: last } = await supabase.from('mm_shopee_offers').select('run_date').in('keyword', list.map(k => k.keyword)).order('run_date', { ascending: false }).limit(1)
      const d = last?.[0]?.run_date as string | undefined
      if (!d) { setLoading(false); return }
      const { data } = await supabase.from('mm_shopee_offers')
        .select('item_id,keyword,name,price,sales,rating,commission_rate,commission,score,image,product_link,affiliate_link')
        .eq('run_date', d).in('keyword', list.map(k => k.keyword)).limit(2000)
      setItems(((data ?? []) as Omit<Item, 'group'>[]).map(o => ({
        ...o, price: Number(o.price), sales: Number(o.sales), rating: Number(o.rating), commission_rate: Number(o.commission_rate),
        commission: Number(o.commission), score: Number(o.score), group: niche.get(o.keyword) === 'casa' && XMAS.test(o.keyword) ? 'decor' : 'gift',
      })))
      setDay(d); setLoading(false)
    })()
  }, [])

  const sortFn = (a: Item, b: Item) => sort === 'sales' ? b.sales - a.sales : sort === 'commission' ? b.commission - a.commission : sort === 'price' ? a.price - b.price : b.score - a.score
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase()
    return items
      .filter(i => group === 'all' || i.group === group)
      .filter(i => !onlyGood || (i.commission_rate >= 10 && i.sales >= 100))
      .filter(i => !f || i.name.toLowerCase().includes(f) || i.keyword.includes(f))
      .sort(sortFn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, group, onlyGood, filter, sort])
  const liveShown = useMemo(() => live.filter(i => !onlyGood || i.commission_rate >= 10).sort(sortFn),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [live, onlyGood, sort])

  const counts = { decor: items.filter(i => i.group === 'decor').length, gift: items.filter(i => i.group === 'gift').length }
  const best = [...items].filter(i => i.commission_rate >= 10).sort((a, b) => b.commission - a.commission)[0]

  async function search(term = q) {
    const t = term.trim()
    if (!t) return
    setQ(t); setBusy(true); setLiveMsg(''); setLive([])
    try {
      const r = await fetch(`/api/shopee/products?q=${encodeURIComponent(t)}&sort=2`)
      const j = await r.json()
      if (!r.ok) setLiveMsg(j.error || 'A Shopee não respondeu. Tente de novo.')
      else { setLive((j.items as Product[]).map(p => fromProduct(p, t))); if (!j.items.length) setLiveMsg('Nada encontrado com esse termo.') }
    } catch { setLiveMsg('Sem conexão com a Shopee agora.') }
    setBusy(false)
  }

  // Gera (uma vez) o link curto com Sub ID natal/app/<item>; se a Shopee falhar, usa o link de afiliado padrão.
  async function linkFor(it: Item) {
    if (links[it.item_id]) return links[it.item_id]
    let link = it.affiliate_link || ''
    if (it.product_link) {
      try {
        const r = await fetch('/api/shopee/shortlink', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: it.product_link, subIds: ['natal', 'app', String(it.item_id)] }) })
        const j = await r.json()
        if (r.ok && j.shortLink) link = j.shortLink
      } catch { /* fica o link padrão */ }
    }
    if (link) setLinks(m => ({ ...m, [it.item_id]: link }))
    return link
  }
  async function act(it: Item, what: 'link' | 'msg' | 'zap') {
    setWorking(it.item_id)
    const link = await linkFor(it)
    setWorking(undefined)
    if (!link) return
    if (what === 'zap') { window.location.href = `https://wa.me/?text=${encodeURIComponent(message(it, link))}`; return }
    const text = what === 'msg' ? message(it, link) : link
    try { await navigator.clipboard.writeText(text) } catch { window.prompt('Copie:', text) }
    setDone({ id: it.item_id, what })
  }

  const card = (it: Item) => {
    const good = it.commission_rate >= 10
    const busyHere = working === it.item_id
    const copied = done?.id === it.item_id ? done.what : ''
    return (
      <article key={`${it.group}-${it.item_id}`} className={s.xItem}>
        {it.image ? <img className={s.xImg} src={it.image} alt="" loading="lazy" /> : <span className={s.xImg} />}
        <div className={s.xInfo}>
          <b className={s.xName}>{it.name}</b>
          <div className={s.xMeta}>
            <span className={s.xPrice}>{brl(it.price)}</span>
            <span>⭐ {it.rating ? it.rating.toFixed(1).replace('.', ',') : '—'}</span>
            <span>{it.sales.toLocaleString('pt-BR')} vendidos</span>
          </div>
          <div className={s.xMeta}>
            <span className={good ? s.xCom : s.xComLow}>{brl(it.commission)} por venda</span>
            <span style={{ color: good ? '#34d399' : 'var(--amber)' }}>{it.commission_rate.toFixed(0)}%</span>
            <span className={s.xTag}>{it.keyword}</span>
          </div>
          {links[it.item_id] && <small className={s.xLink}>{links[it.item_id]}</small>}
        </div>
        <div className={s.xActions}>
          <button className={s.btn} disabled={busyHere} onClick={() => act(it, 'link')}>{busyHere ? 'GERANDO…' : copied === 'link' ? 'LINK COPIADO ✓' : 'COPIAR LINK'}</button>
          <button className={`${s.btn} ${s.btnGhost}`} disabled={busyHere} onClick={() => act(it, 'zap')}>WHATSAPP ↗</button>
          <button className={`${s.btn} ${s.btnGhost}`} disabled={busyHere} onClick={() => act(it, 'msg')}>{copied === 'msg' ? 'TEXTO COPIADO ✓' : 'COPIAR TEXTO'}</button>
          {it.product_link && <a className={`${s.btn} ${s.btnGhost}`} href={it.product_link} target="_blank" rel="noopener noreferrer">VER NA SHOPEE ↗</a>}
        </div>
      </article>
    )
  }

  const dias = daysToXmas()
  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1>🎄 Achados de Natal</h1>
        <p>Decoração e presentes que mais vendem na Shopee agora, com comissão alta. Copie o link (já sai com o Sub ID <b>natal</b>) e poste no grupo, no Instagram ou no status.</p>
      </div>
      <ShopeeTabs />

      <div className={s.stats}>
        <div className={s.stat} style={{ borderColor: 'rgba(239,68,68,.45)' }}><span>Faltam para o Natal</span><strong>{dias} {dias === 1 ? 'dia' : 'dias'}</strong><small>{dias > 10 ? 'pico de compras de decoração' : 'última chance: entrega antes do Natal'}</small></div>
        <div className={s.stat}><span>Achados de hoje</span><strong>{items.length}</strong><small>{counts.decor} decoração · {counts.gift} presentes</small></div>
        <div className={s.stat}><span>Maior comissão</span><strong>{best ? brl(best.commission) : '—'}</strong><small>{best ? shortName(best.name).slice(0, 48) : 'aguardando o minerador'}</small></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <div><h2>Minerados hoje</h2><p>{day ? `Atualizado em ${new Date(day + 'T12:00:00').toLocaleDateString('pt-BR')} · decoração às 08h02 e presentes às 08h33.` : 'O minerador de Natal roda todo dia às 08h02.'}</p></div>
          <span className={s.badge}>{shown.length} NA LISTA</span>
        </div>
        <LastRun kinds={['mine']} />

        <div className={s.xBar}>
          <div className={s.seg} role="tablist" aria-label="Tipo">
            {([['all', 'Tudo'], ['decor', '🎄 Decoração'], ['gift', '🎁 Presentes']] as [Group, string][]).map(([g, l]) => (
              <button key={g} role="tab" aria-selected={group === g} className={group === g ? s.segOn : undefined} onClick={() => setGroup(g)}>{l}</button>
            ))}
          </div>
          <div className={s.chips} style={{ marginTop: 0 }}>
            {SORTS.map(o => <button key={o.id} type="button" className={`${s.chip} ${sort === o.id ? s.chipOn : ''}`} onClick={() => setSort(o.id)}>{o.label}</button>)}
          </div>
          <div className={s.row}>
            <input className={`${s.input} ${s.grow}`} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar: pisca, árvore, presépio…" aria-label="Filtrar achados" />
            <label className={s.check} style={{ marginTop: 0 }}><input type="checkbox" checked={onlyGood} onChange={e => setOnlyGood(e.target.checked)} />Só comissão de 10% ou mais</label>
          </div>
        </div>

        {loading ? <p className={s.hint}>Carregando achados…</p>
          : shown.length === 0 ? <p className={s.hint}>Nada com esses filtros. {onlyGood && 'Desmarque “Só comissão de 10% ou mais” para ver os campeões de venda que pagam menos.'}</p>
          : <div className={s.xList}>{shown.slice(0, 60).map(card)}</div>}
        {shown.length > 60 && <p className={s.hint}>Mostrando os 60 primeiros de {shown.length}. Use o filtro para achar um produto específico.</p>}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Buscar agora na Shopee</h2><p>Procure qualquer item de Natal ao vivo. Os resultados vêm ordenados pela melhor aposta (vendas, comissão e nota).</p></div></div>
        <div className={s.row}>
          <input className={`${s.input} ${s.grow}`} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="ex: pisca pisca 100 leds, presépio, pijama natal" enterKeyHint="search" aria-label="Buscar na Shopee" />
          <button className={s.btn} onClick={() => search()} disabled={busy || !q.trim()}>{busy ? 'BUSCANDO…' : 'BUSCAR'}</button>
        </div>
        <div className={s.chips}>{SUGGESTIONS.map(t => <button key={t} type="button" className={s.chip} onClick={() => search(t)} disabled={busy}>{t}</button>)}</div>
        {liveMsg && <p className={`${s.hint} ${s.err}`}>{liveMsg}</p>}
        {liveShown.length > 0 && <div className={s.xList} style={{ marginTop: 14 }}>{liveShown.map(card)}</div>}
        {live.length > 0 && liveShown.length === 0 && <p className={s.hint}>Nenhum resultado paga 10% ou mais. Desmarque o filtro de comissão lá em cima para ver todos.</p>}
      </section>

      <p className={s.hint}>Preço, estoque e comissão mudam ao longo do dia na Shopee. Confira antes de impulsionar um post. Os pedidos feitos pelos seus links aparecem em Ganhos com o Sub ID <b>natal</b>.</p>
    </div>
  )
}

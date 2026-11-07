'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import s from '../shopee.module.css'
import { ApiBadge, ShopeeTabs, brl, useApiStatus, type Product } from '../shared'
import DailyRanking from '../DailyRanking'
import ChristmasPicks from '../ChristmasPicks'

export default function MineradorPage() {
  const router = useRouter()
  const api = useApiStatus()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('2')
  const [products, setProducts] = useState<Product[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<number>()

  async function mine() {
    if (!q.trim()) return
    setBusy(true); setMsg(''); setProducts([])
    try {
      const r = await fetch(`/api/shopee/products?q=${encodeURIComponent(q)}&sort=${sort}`)
      const j = await r.json()
      if (!r.ok) setMsg(j.error)
      else { setProducts(j.items); if (!j.items.length) setMsg('Nenhum produto encontrado.') }
    } catch { setMsg('Falha ao consultar a Shopee.') }
    setBusy(false)
  }

  return (
    <div className={s.page}>
      <div className={s.head}><h1>Minerador Shopee</h1><p>Produtos que mais vendem e mais pagam comissão, com nota de oportunidade e seu link de afiliado.</p></div>
      <ShopeeTabs />

      {api === 'off' && (
        <section className={s.panel} style={{ borderColor: 'rgba(245,158,11,.4)' }}>
          <div className={s.panelHead}><div><h2>API aguardando liberação da Shopee</h2><p>Você já pediu o acesso. Enquanto isso, garimpe no portal em Oferta → Oferta de produto:</p></div></div>
          <div className={s.row}>
            <a className={s.btn} href="https://affiliate.shopee.com.br" target="_blank" rel="noopener noreferrer">PORTAL DE AFILIADOS ↗</a>
            <Link className={`${s.btn} ${s.btnGhost}`} href="/shopee/afiliado">VER PRIMEIROS PASSOS</Link>
          </div>
          <p className={s.hint}>Critério rápido: +1.000 vendas, nota 4,5+, comissão a partir de R$ 3 por venda e produto que dá para demonstrar em vídeo.</p>
        </section>
      )}

      <ChristmasPicks onSubId={(link, name) => router.push(`/shopee/subid?link=${encodeURIComponent(link)}&name=${encodeURIComponent(name)}`)} />

      <DailyRanking onSubId={(link, name) => router.push(`/shopee/subid?link=${encodeURIComponent(link)}&name=${encodeURIComponent(name)}`)} />

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Buscar agora</h2><p>Score 0–100 = 50% demanda (vendas) + 35% comissão em R$ + 15% nota.</p></div><ApiBadge /></div>
        <div className={s.row}>
          <input className={`${s.input} ${s.grow}`} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && mine()} placeholder="ex: protetor solar facial, mini processador, escova secadora" />
          <select className={s.select} value={sort} onChange={e => setSort(e.target.value)}><option value="2">Mais vendidos</option><option value="5">Maior comissão</option><option value="1">Relevância</option></select>
          <button className={s.btn} onClick={mine} disabled={busy || !q.trim() || api === 'off'}>{busy ? 'MINERANDO...' : 'MINERAR'}</button>
        </div>
        {msg && <div className={`${s.hint} ${s.err}`}>{msg}</div>}
        {products.length > 0 && <div className={s.tableWrap}><table className={s.table}>
          <thead><tr><th>Score</th><th></th><th>Produto</th><th>Preço</th><th>Vendas</th><th>Nota</th><th>Comissão</th><th>Ações</th></tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id}>
              <td className={s.score}>{p.score}</td>
              <td>{p.image && <img src={p.image} alt="" />}</td>
              <td>{p.name}<small style={{ display: 'block', color: 'var(--text3)' }}>{p.shop}</small></td>
              <td>{brl(p.price)}</td><td>{p.sales.toLocaleString('pt-BR')}</td><td>{p.rating.toFixed(1)}</td>
              <td>{brl(p.commission)}<small style={{ display: 'block', color: 'var(--text3)' }}>{p.commissionRate.toFixed(1)}%</small></td>
              <td><div className={s.actions}>
                <button className={`${s.btn} ${s.btnGhost}`} onClick={() => { navigator.clipboard?.writeText(p.affiliateLink); setCopied(p.id) }}>{copied === p.id ? 'COPIADO ✓' : 'COPIAR LINK'}</button>
                <button className={s.btn} onClick={() => router.push(`/shopee/subid?link=${encodeURIComponent(p.productLink)}&name=${encodeURIComponent(p.name)}`)}>SUB ID →</button>
                <a className={`${s.btn} ${s.btnGhost}`} href={`https://www.tiktok.com/search/video?q=${encodeURIComponent(p.name.split(' ').slice(0, 5).join(' '))}`} target="_blank" rel="noopener noreferrer">VÍDEOS ↗</a>
              </div></td>
            </tr>
          ))}</tbody>
        </table></div>}
      </section>
    </div>
  )
}

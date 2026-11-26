'use client'
import { useState } from 'react'
import s from './shopee.module.css'
import { brl, type Product } from './shared'

// Cartão de produto da Shopee usado nas telas Natal e Em alta: foto, preço, vendas, comissão
// e os botões COPIAR LINK (gera link curto com Sub ID), WHATSAPP, COPIAR TEXTO e VER NA SHOPEE.

export type OfferItem = {
  item_id: number; keyword: string; name: string; price: number; sales: number; rating: number
  commission_rate: number; commission: number; score: number; image: string | null
  product_link: string | null; affiliate_link: string | null
}

export const shortName = (n: string) => { const t = n.replace(/\s+/g, ' ').trim(); return t.length > 80 ? t.slice(0, 80).replace(/\s+\S*$/, '') + '…' : t }

export const fromProduct = (p: Product, keyword: string): OfferItem => ({
  item_id: p.id, keyword, name: p.name, price: p.price, sales: p.sales, rating: p.rating, commission_rate: p.commissionRate,
  commission: p.commission, score: p.score, image: p.image || null, product_link: p.productLink || null, affiliate_link: p.affiliateLink || null,
})

/** Converte uma linha de mm_shopee_offers (numéricos chegam como texto) em OfferItem. */
export const fromRow = (o: Record<string, unknown>): OfferItem => ({
  item_id: Number(o.item_id), keyword: String(o.keyword ?? ''), name: String(o.name ?? ''), price: Number(o.price), sales: Number(o.sales),
  rating: Number(o.rating), commission_rate: Number(o.commission_rate), commission: Number(o.commission), score: Number(o.score),
  image: (o.image as string) || null, product_link: (o.product_link as string) || null, affiliate_link: (o.affiliate_link as string) || null,
})

export function offerMessage(it: OfferItem, link: string, emoji = '🛍️') {
  return [
    `${emoji} *${shortName(it.name)}*`,
    `💰 *${brl(Number(it.price))}*`,
    `${it.rating >= 4 ? `⭐ ${Number(it.rating).toFixed(1).replace('.', ',')} · ` : ''}${Number(it.sales).toLocaleString('pt-BR')} vendidos`,
    ``,
    `👉 ${link}`,
    ``,
    `_Link de afiliado: posso ganhar comissão, sem custo a mais pra você. Preço e estoque podem mudar._`,
  ].join('\n')
}

export default function OfferCard({ it, sub, emoji }: { it: OfferItem; sub: string; emoji?: string }) {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'' | 'link' | 'msg'>('')

  // Gera (uma vez) o link curto com Sub ID <sub>/app/<item>; se a Shopee falhar, usa o link de afiliado padrão.
  async function linkFor() {
    if (link) return link
    let l = it.affiliate_link || ''
    if (it.product_link) {
      try {
        const r = await fetch('/api/shopee/shortlink', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: it.product_link, subIds: [sub, 'app', String(it.item_id)] }) })
        const j = await r.json()
        if (r.ok && j.shortLink) l = j.shortLink
      } catch { /* fica o link padrão */ }
    }
    if (l) setLink(l)
    return l
  }
  async function act(what: 'link' | 'msg' | 'zap') {
    setBusy(true)
    const l = await linkFor()
    setBusy(false)
    if (!l) return
    if (what === 'zap') { window.location.href = `https://wa.me/?text=${encodeURIComponent(offerMessage(it, l, emoji))}`; return }
    const text = what === 'msg' ? offerMessage(it, l, emoji) : l
    try { await navigator.clipboard.writeText(text) } catch { window.prompt('Copie:', text) }
    setDone(what)
  }

  const good = it.commission_rate >= 10
  return (
    <article className={s.xItem}>
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
        {link && <small className={s.xLink}>{link}</small>}
      </div>
      <div className={s.xActions}>
        <button className={s.btn} disabled={busy} onClick={() => act('link')}>{busy ? 'GERANDO…' : done === 'link' ? 'LINK COPIADO ✓' : 'COPIAR LINK'}</button>
        <button className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={() => act('zap')}>WHATSAPP ↗</button>
        <button className={`${s.btn} ${s.btnGhost}`} disabled={busy} onClick={() => act('msg')}>{done === 'msg' ? 'TEXTO COPIADO ✓' : 'COPIAR TEXTO'}</button>
        {it.product_link && <a className={`${s.btn} ${s.btnGhost}`} href={it.product_link} target="_blank" rel="noopener noreferrer">VER NA SHOPEE ↗</a>}
      </div>
    </article>
  )
}

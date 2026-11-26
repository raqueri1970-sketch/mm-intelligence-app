'use client'
import { useState } from 'react'
import s from './shopee.module.css'
import { brl } from './shared'

// Postar no Instagram a partir do app (enquanto a publicação automática pela Meta não está ligada):
//   1º toque: copia a legenda e prepara a foto do produto;
//   2º toque: abre o "compartilhar" do celular com a foto → escolha Instagram (Feed, Story ou Reels) e cole a legenda.
// No computador, baixa a foto e copia a legenda.

export type InstaProduct = { name: string; price: number; sales: number; rating: number; image: string | null; keyword?: string }

const clean = (n: string) => { const t = n.replace(/\s+/g, ' ').trim(); return t.length > 90 ? t.slice(0, 90).replace(/\s+\S*$/, '') + '…' : t }

export function instaCaption(p: InstaProduct) {
  const xmas = /natal|noel|natalin|reveillon|réveillon/i.test(`${p.keyword ?? ''} ${p.name}`)
  const tags = xmas
    ? '#achadinhos #achadinhosshopee #shopee #natal #decoracaodenatal #natal2026 #arvoredenatal #casadecorada #promocao'
    : '#achadinhos #achadinhosshopee #shopee #achadinhosdecasa #casaorganizada #utilidadesdomesticas #promocao'
  return [
    `${xmas ? '🎄' : '🏠'} ${clean(p.name)}`,
    ``,
    `💰 ${brl(Number(p.price))}${p.rating >= 4 ? ` · ⭐ ${Number(p.rating).toFixed(1).replace('.', ',')}` : ''} · ${Number(p.sales).toLocaleString('pt-BR')} vendidos`,
    ``,
    `🔗 O link está no perfil: entra no Grupo VIP e pega todas as ofertas do dia`,
    `💬 Comente EU QUERO que eu te mando`,
    ``,
    tags,
  ].join('\n')
}

export default function InstaShare({ p, className }: { p: InstaProduct; className?: string }) {
  const [state, setState] = useState<'idle' | 'prep' | 'ready' | 'done' | 'err'>('idle')
  const [file, setFile] = useState<File | null>(null)

  async function first() {
    const caption = instaCaption(p)
    try { await navigator.clipboard.writeText(caption) } catch { window.prompt('Copie a legenda:', caption) }
    if (!p.image) { setState('done'); return }
    setState('prep')
    try {
      const r = await fetch(p.image)
      if (!r.ok) throw new Error(String(r.status))
      const blob = await r.blob()
      const ext = blob.type.includes('png') ? 'png' : 'jpg'
      const f = new File([blob], `kliccasa-${Date.now()}.${ext}`, { type: blob.type || 'image/jpeg' })
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [f] })) { setFile(f); setState('ready'); return }
      // computador: baixa a foto
      const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 30000)
      setState('done')
    } catch { window.open(p.image, '_blank', 'noopener'); setState('done') }
  }
  async function second() {
    if (!file) return
    try { await navigator.share({ files: [file] }); setState('done') }
    catch (e) { if ((e as Error)?.name !== 'AbortError') setState('err'); else setState('ready') }
  }

  const label = state === 'prep' ? 'PREPARANDO…'
    : state === 'ready' ? '📲 ABRIR NO INSTAGRAM'
    : state === 'done' ? 'LEGENDA COPIADA ✓'
    : state === 'err' ? 'TENTE DE NOVO'
    : '📸 INSTAGRAM'
  return (
    <button type="button" className={className ?? `${s.btn} ${s.btnInsta}`} disabled={state === 'prep'}
      onClick={() => (state === 'ready' ? second() : first())}
      title="Copia a legenda e abre a foto para postar no Instagram">
      {label}
    </button>
  )
}

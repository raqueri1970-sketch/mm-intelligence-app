'use client'
import { useEffect, useMemo, useState } from 'react'
import s from './shopee.module.css'

// Gera um link de afiliado por vídeo/rede com Sub IDs padronizados:
//   sub1 = rede · sub2 = produto · sub3 = vídeo (remix01) · sub4 = gancho (g1)
// Assim, na aba "Conversão" da Shopee, dá para ver qual vídeo e qual gancho venderam.

const NETWORKS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'shopeevideo', label: 'Shopee Vídeo' },
  { id: 'reels', label: 'Reels' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'whats', label: 'WhatsApp' },
]
const STORE_KEY = 'mm-subid-generator-v1'

export const cleanId = (v: string) =>
  v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)

function productCodeFrom(text: string) {
  // usa o nome do produto no link (shopee.com.br/Nome-Do-Produto-i.123.456) ou o texto digitado
  let name = text
  try {
    const u = new URL(text)
    name = decodeURIComponent(u.pathname.split('/').filter(Boolean)[0] || '').replace(/-i\.\d+\.\d+$/, '')
  } catch { /* não é URL */ }
  const words = name.split(/[\s\-_]+/).map(cleanId).filter(w => w.length > 2).slice(0, 2)
  return words.join('').slice(0, 16)
}

type Row = { key: string; video: string; network: string; hookNo: number; hook: string; subIds: string[] }
type Saved = { link: string; product: string; videos: number; nets: string[]; links: Record<string, string> }

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {})
}

function csvCell(v: string | number) {
  const t = String(v)
  return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export default function SubIdGenerator({ hooks, videoCount, seed }: { hooks: string[]; videoCount: number; seed?: { link: string; name: string; at: number } }) {
  const [link, setLink] = useState('')
  const [product, setProduct] = useState('')
  const [videos, setVideos] = useState(videoCount)
  const [nets, setNets] = useState<string[]>(['tiktok', 'shopeevideo'])
  const [links, setLinks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState('')
  const [loaded, setLoaded] = useState(false)

  // restaura o último trabalho deste navegador
  useEffect(() => {
    try {
      const saved: Saved | null = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
      if (saved) {
        setLink(saved.link || ''); setProduct(saved.product || ''); setVideos(saved.videos || videoCount)
        setNets(saved.nets?.length ? saved.nets : ['tiktok', 'shopeevideo']); setLinks(saved.links || {})
      }
    } catch { /* sem storage */ }
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ link, product, videos, nets, links } satisfies Saved)) } catch { /* ok */ }
  }, [loaded, link, product, videos, nets, links])

  // produto escolhido no Minerador
  useEffect(() => {
    if (!seed) return
    setLink(seed.link); setProduct(productCodeFrom(seed.name)); setLinks({})
    document.getElementById('gerador-subid')?.scrollIntoView({ behavior: 'smooth' })
  }, [seed])

  const prod = cleanId(product) || 'produto'
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (let i = 0; i < videos; i++) {
      const video = `remix${String(i + 1).padStart(2, '0')}`
      const hookNo = hooks.length ? (i % hooks.length) + 1 : 0
      for (const network of nets) {
        const subIds = [network, prod, video, ...(hookNo ? [`g${hookNo}`] : [])]
        out.push({ key: subIds.join('-'), video, network, hookNo, hook: hooks[hookNo - 1] || '', subIds })
      }
    }
    return out
  }, [videos, nets, prod, hooks])

  const done = rows.filter(r => links[r.key]).length
  const validLink = /^https:\/\/([a-z0-9-]+\.)*shopee\.com\.br\//i.test(link.trim())

  function flash(id: string, text: string) {
    copy(text); setCopied(id); setTimeout(() => setCopied(c => (c === id ? '' : c)), 1200)
  }

  async function generateAll() {
    if (!validLink) { setMsg('Cole primeiro o link do produto da Shopee (shopee.com.br/...).'); return }
    setBusy(true); setMsg('')
    let ok = 0
    for (const r of rows) {
      if (links[r.key]) { ok++; continue }
      const res = await fetch('/api/shopee/shortlink', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: link.trim(), subIds: r.subIds }),
      })
      const j = await res.json().catch(() => ({ error: `Erro ${res.status}` }))
      if (!res.ok) {
        setMsg(res.status === 503
          ? 'API da Shopee ainda não configurada. Enquanto isso, use o app: Link de Conversão → cole o link → "Adicionar Sub id" e copie os Sub ids de cada linha abaixo. Depois cole o link gerado na coluna "Seu link".'
          : j.error)
        break
      }
      setLinks(l => ({ ...l, [r.key]: j.shortLink })); ok++
      await new Promise(w => setTimeout(w, 300))
    }
    setBusy(false)
    if (ok === rows.length) setMsg(`✓ ${ok} links gerados.`)
  }

  function exportCsv() {
    const head = ['video', 'rede', 'gancho_no', 'gancho', 'sub_id1', 'sub_id2', 'sub_id3', 'sub_id4', 'link_afiliado', 'link_produto']
    const lines = rows.map(r => [r.video, r.network, r.hookNo || '', r.hook, ...[0, 1, 2, 3].map(i => r.subIds[i] || ''), links[r.key] || '', link].map(csvCell).join(';'))
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `subids-${prod}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10000)
  }

  return (
    <section className={s.panel} id="gerador-subid">
      <div className={s.panelHead}>
        <div>
          <h2>Gerador de Sub ID</h2>
          <p>Um link por vídeo e por rede. Na aba &quot;Conversão&quot; da Shopee você vê qual vídeo e qual gancho venderam.</p>
        </div>
        <span className={s.badge}>{done}/{rows.length} LINKS</span>
      </div>

      <div className={s.settings} style={{ marginTop: 0 }}>
        <label style={{ gridColumn: '1 / -1' }}>Link do produto na Shopee
          <input className={s.input} value={link} onChange={e => { setLink(e.target.value); if (!product) setProduct(productCodeFrom(e.target.value)) }} placeholder="https://shopee.com.br/Nome-do-produto-i.123.456" />
        </label>
        <label>Código do produto (sub_id2)
          <input className={s.input} value={product} onChange={e => setProduct(cleanId(e.target.value))} placeholder="protetor70" />
        </label>
        <label>Quantos vídeos
          <input className={s.input} type="number" min={1} max={50} value={videos} onChange={e => setVideos(Math.max(1, Math.min(50, +e.target.value || 1)))} />
        </label>
      </div>

      <div className={s.chips}>
        {NETWORKS.map(n => (
          <label key={n.id} className={`${s.chip} ${nets.includes(n.id) ? s.chipOn : ''}`}>
            <input type="checkbox" checked={nets.includes(n.id)} onChange={e => setNets(v => e.target.checked ? [...v, n.id] : v.filter(x => x !== n.id))} />
            {n.label}
          </label>
        ))}
      </div>

      <div className={s.row} style={{ marginTop: 12 }}>
        <button className={s.btn} disabled={busy || !rows.length} onClick={generateAll}>{busy ? 'GERANDO...' : 'GERAR LINKS AUTOMÁTICOS'}</button>
        <button className={`${s.btn} ${s.btnGhost}`} disabled={!rows.length} onClick={exportCsv}>EXPORTAR PLANILHA</button>
        <button className={`${s.btn} ${s.btnGhost}`} disabled={!done} onClick={() => setLinks({})}>LIMPAR LINKS</button>
      </div>
      {msg && <div className={`${s.hint} ${msg.startsWith('✓') ? s.ok : s.wait}`}>{msg}</div>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>Vídeo</th><th>Rede</th><th>Gancho</th><th>Sub ids (toque para copiar)</th><th>Seu link</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key}>
                <td><b>{r.video}</b></td>
                <td>{NETWORKS.find(n => n.id === r.network)?.label}</td>
                <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--text2)' }}>{r.hookNo ? `g${r.hookNo} — ${r.hook}` : '—'}</td>
                <td>
                  <div className={s.subids}>
                    {r.subIds.map((id, i) => (
                      <button key={i} className={s.subid} onClick={() => flash(`${r.key}-${i}`, id)} title={`Sub id ${i + 1}`}>
                        <span>{i + 1}</span>{copied === `${r.key}-${i}` ? 'copiado ✓' : id}
                      </button>
                    ))}
                  </div>
                </td>
                <td style={{ minWidth: 230 }}>
                  <div className={s.row} style={{ flexWrap: 'nowrap' }}>
                    <input className={s.input} style={{ padding: '8px 10px', fontSize: 12 }} value={links[r.key] || ''} onChange={e => setLinks(l => ({ ...l, [r.key]: e.target.value.trim() }))} placeholder="cole o link convertido" />
                    <button className={`${s.btn} ${s.btnGhost}`} style={{ padding: '8px 10px' }} disabled={!links[r.key]} onClick={() => flash(`${r.key}-link`, links[r.key])}>{copied === `${r.key}-link` ? '✓' : 'COPIAR'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.hint}>Sem API: no app da Shopee abra Link de Conversão → cole o link do produto → &quot;Adicionar Sub id&quot; → preencha 1, 2, 3 e 4 na ordem acima → Converter. Os Sub ids usam só letras minúsculas e números. Tudo fica salvo neste navegador.</p>
    </section>
  )
}

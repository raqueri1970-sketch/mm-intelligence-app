'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import s from '../shopee.module.css'
import { remix, type RemixResult } from '../remixer'
import { BANNED, KEYS, QueryReader, ShopeeTabs, saveBlob, useHooks, useLocal } from '../shared'

type Job = { url: string; status: 'wait' | 'ok' | 'err'; msg: string }

export default function CriativosPage() {
  const { text: hooksText, setText: setHooksText, hooks, bad: badHooks } = useHooks()
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [busy, setBusy] = useState(false)
  const [rights, setRights] = useLocal('mm-video-rights-v2', false)
  const [saveCopy, setSaveCopy] = useLocal('mm-video-savecopy', true)
  const [count, setCount] = useLocal(KEYS.remixCount, 10)
  const [seconds, setSeconds] = useLocal('mm-shopee-remix-seconds', 20)
  const [cta, setCta] = useLocal('mm-shopee-remix-cta', 'Link na bio • carrinho laranja')
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState<RemixResult[]>([])
  const [remixing, setRemixing] = useState(false)
  const badCta = BANNED.test(cta)


  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews])

  function addFiles(list: FileList | File[] | null) { if (list) setFiles(v => [...v, ...Array.from(list)].slice(0, 30)) }

  async function downloadOne(url: string): Promise<Job> {
    try {
      const r = await fetch(`/api/video/download?url=${encodeURIComponent(url)}`)
      if (!r.ok) { const j = await r.json().catch(() => ({ error: `Erro ${r.status}` })); return { url, status: 'err', msg: j.error } }
      const blob = await r.blob()
      const name = r.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || 'video.mp4'
      const title = decodeURIComponent(r.headers.get('x-video-title') || name)
      addFiles([new File([blob], name, { type: blob.type || 'video/mp4' })])
      if (saveCopy) saveBlob(blob, name)
      return { url, status: 'ok', msg: `${(blob.size / 1048576).toFixed(1)} MB • ${title.slice(0, 70)}` }
    } catch (e) { return { url, status: 'err', msg: e instanceof Error ? e.message : 'Falha' } }
  }

  async function downloadAll(list: string[]) {
    const urls = [...new Set(list.map(l => l.trim()).filter(Boolean))]
    if (!urls.length) return
    if (!rights) { setJobs([{ url: '', status: 'err', msg: 'Marque a confirmação de autorização antes de baixar.' }]); return }
    setBusy(true)
    setJobs(urls.map(url => ({ url, status: 'wait', msg: 'baixando...' })))
    for (let i = 0; i < urls.length; i++) { // um por vez para não ser bloqueado
      const res = await downloadOne(urls[i])
      setJobs(j => j.map((x, k) => (k === i ? res : x)))
    }
    setBusy(false)
  }

  async function runRemix() {
    setRemixing(true); setResults([]); setProgress('')
    try { setResults(await remix(files, { hooks, count, targetSeconds: seconds, cta, onProgress: setProgress })) }
    catch (e) { setProgress(e instanceof Error ? e.message : 'Falha no remix') }
    setRemixing(false)
  }

  return (
    <div className={s.page}>
      <div className={s.head}><h1>Criativos</h1><p>Baixe as referências, ajuste os ganchos e gere vários vídeos novos em 9:16 — tudo aqui.</p></div>
      <ShopeeTabs />
      <QueryReader onQuery={p => { const l = p.get('links'); if (l) setLinks(l) }} />

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>1. Baixar vídeos pelo link</h2><p>TikTok, Mercado Livre Clips, Instagram ou .mp4 — um por linha. Baixa sozinho e já entra no banco abaixo.</p></div><span className={s.badge}>AUTOMÁTICO</span></div>
        <textarea className={s.textarea} value={links} onChange={e => setLinks(e.target.value)} placeholder={'https://www.tiktok.com/@loja/video/123...\nhttps://vm.tiktok.com/ZMxxxx/\nhttps://www.mercadolivre.com.br/shorts/clips/...'} />
        <label className={s.check}><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} />Confirmo que os vídeos são meus, da marca/vendedor com autorização, ou que vou usar só como referência de roteiro. Repostar vídeo de outro criador derruba alcance e pode banir a conta.</label>
        <label className={s.check}><input type="checkbox" checked={saveCopy} onChange={e => setSaveCopy(e.target.checked)} />Também salvar uma cópia no computador</label>
        <div className={s.row} style={{ marginTop: 12 }}><button className={s.btn} disabled={busy || !links.trim()} onClick={() => downloadAll(links.split('\n'))}>{busy ? 'BAIXANDO...' : 'BAIXAR TODOS ↓'}</button></div>
        {jobs.length > 0 && <div className={s.jobs}>{jobs.map((j, i) => <div key={i} className={s.job}><code title={j.url}>{j.url || '—'}</code><span className={s[j.status]}>{j.status === 'ok' ? '✓ ' : j.status === 'err' ? '✕ ' : '… '}{j.msg}</span></div>)}</div>}
        <p className={s.hint}>YouTube não é suportado. O vídeo do TikTok vem no arquivo oficial de download (com o crédito do criador).</p>
      </section>

      <section className={s.panel} id="ganchos">
        <div className={s.panelHead}><div><h2>2. Ganchos</h2><p>Um por linha. Cada vídeo abre com um gancho diferente (g1, g2…). A mesma lista alimenta o Sub ID.</p></div><span className={s.badge}>{hooks.length} GANCHOS</span></div>
        <textarea className={s.textarea} style={{ minHeight: 150, fontFamily: 'var(--font)' }} value={hooksText} onChange={e => setHooksText(e.target.value)} />
        {badHooks.length > 0 && <div className={`${s.hint} ${s.err}`}>⚠ Termos proibidos (compliance) em: {badHooks.join(' • ')}</div>}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>3. Banco + Remix</h2><p>Gancho (3s) + trechos dos outros vídeos + CTA final. Os vídeos ficam só nesta aba — não troque de página durante o remix.</p></div><span className={s.badge}>{files.length} VÍDEOS</span></div>
        <label className={s.drop} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }}><b>＋ ADICIONAR VÍDEOS</b><div style={{ color: 'var(--text3)', marginTop: 5, fontSize: 13 }}>Arraste ou clique • MP4, MOV ou WEBM • até 30 arquivos</div><input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} /></label>
        {files.length > 0 && <div className={s.grid}>{files.map((f, i) => <div key={f.name + i} className={s.thumb}><video src={previews[i]} controls muted /><b title={f.name}>{f.name}</b><button className={s.remove} onClick={() => setFiles(v => v.filter((_, k) => k !== i))}>✕</button></div>)}</div>}
        <div className={s.settings}>
          <label>Quantos vídeos<input className={s.input} type="number" min={1} max={30} value={count} onChange={e => setCount(Math.max(1, Math.min(30, +e.target.value || 1)))} /></label>
          <label>Duração (segundos)<input className={s.input} type="number" min={8} max={60} value={seconds} onChange={e => setSeconds(Math.max(8, Math.min(60, +e.target.value || 20)))} /></label>
          <label>Texto final (CTA)<input className={s.input} value={cta} onChange={e => setCta(e.target.value)} /></label>
        </div>
        {badCta && <div className={`${s.hint} ${s.err}`}>⚠ O texto final tem termo proibido (compliance). Troque antes de gerar.</div>}
        <div className={s.row} style={{ marginTop: 12 }}>
          <button className={s.btn} disabled={remixing || files.length < 2 || badHooks.length > 0 || badCta} onClick={runRemix}>{remixing ? 'GERANDO...' : `GERAR ${count} VÍDEOS`}</button>
          {results.length > 0 && <button className={`${s.btn} ${s.btnGhost}`} onClick={() => results.forEach((r, i) => setTimeout(() => saveBlob(r.blob, r.name), i * 400))}>BAIXAR TODOS OS REMIX ↓</button>}
          {results.length > 0 && <Link className={s.btn} href="/shopee/subid">GERAR SUB IDS DESTES VÍDEOS →</Link>}
        </div>
        <p className={s.hint}>O remix roda no seu navegador em tempo real (≈ {Math.max(1, Math.ceil(count * seconds / 60))} min para {count} vídeos). Deixe esta aba aberta e em primeiro plano. Use Chrome ou Edge.</p>
        {progress && <div className={s.progress}>{progress}</div>}
        {results.length > 0 && <div className={s.grid}>{results.map(r => <div key={r.name} className={s.thumb}><video src={r.url} controls /><b>{r.name}</b><small style={{ fontSize: 10, color: 'var(--text3)', display: 'block' }}>{r.recipe}</small><a className={`${s.btn} ${s.btnGhost}`} style={{ display: 'block', textAlign: 'center', marginTop: 6 }} href={r.url} download={r.name}>BAIXAR</a></div>)}</div>}
      </section>
    </div>
  )
}

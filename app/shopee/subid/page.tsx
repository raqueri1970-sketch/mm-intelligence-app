'use client'
import { useState } from 'react'
import s from '../shopee.module.css'
import SubIdGenerator from '../SubIdGenerator'
import { KEYS, QueryReader, ShopeeTabs, useHooks, useLocal } from '../shared'

export default function SubIdPage() {
  const { hooks } = useHooks()
  const [count, , ready] = useLocal(KEYS.remixCount, 10)
  const [seed, setSeed] = useState<{ link: string; name: string; at: number }>()


  return (
    <div className={s.page}>
      <div className={s.head}><h1>Sub ID</h1><p>Um link de afiliado por vídeo e por rede. Depois, no Relatório de vendas da Shopee, você vê qual vídeo e qual gancho venderam.</p></div>
      <ShopeeTabs />
      {/* produto enviado pelo Minerador (?link=...&name=...) */}
      <QueryReader onQuery={p => { const link = p.get('link'); if (link) setSeed({ link, name: p.get('name') || link, at: Date.now() }) }} />
      {ready && <SubIdGenerator hooks={hooks} videoCount={count} seed={seed} />}
    </div>
  )
}

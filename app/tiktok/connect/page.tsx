'use client'

import { useEffect, useState } from 'react'

type Result = {
  connected: boolean
  name?: string
  followers?: string
  likes?: string
  videos?: string
  verified?: string
  error?: string
}

export default function TikTokConnectPage() {
  const [result, setResult] = useState<Result>({ connected: false })

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setResult({
      connected: p.get('connected') === '1',
      name: p.get('name') || undefined,
      followers: p.get('followers') || undefined,
      likes: p.get('likes') || undefined,
      videos: p.get('videos') || undefined,
      verified: p.get('verified') || undefined,
      error: p.get('error') || undefined,
    })
  }, [])

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: '48px 20px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: '#25f4ee', textTransform: 'uppercase' }}>MM Intelligence · TikTok Sandbox</div>
        <h1 style={{ margin: '10px 0 8px', fontSize: 30 }}>Conectar TikTok</h1>
        <p style={{ margin: 0, color: 'var(--text3)', lineHeight: 1.6 }}>Fluxo oficial de teste para autorizar leitura de perfil público, estatísticas da conta e lista de vídeos.</p>
      </div>

      <section style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 22 }}>
        {!result.connected && !result.error && (
          <>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Pronto para testar</h2>
            <p style={{ color: 'var(--text3)', lineHeight: 1.6 }}>Clique abaixo. O TikTok abrirá a tela de autorização do Sandbox e depois retornará para a MM.</p>
            <a href="/api/auth/tiktok/start" style={{ display: 'inline-block', marginTop: 8, background: '#111827', color: '#fff', borderRadius: 10, padding: '12px 16px', textDecoration: 'none', fontWeight: 800 }}>Conectar TikTok</a>
          </>
        )}

        {result.error && (
          <>
            <h2 style={{ marginTop: 0, fontSize: 18, color: '#ef4444' }}>Falha na conexão</h2>
            <p style={{ color: 'var(--text3)' }}>{result.error}</p>
            <a href="/api/auth/tiktok/start" style={{ display: 'inline-block', marginTop: 8, background: '#111827', color: '#fff', borderRadius: 10, padding: '12px 16px', textDecoration: 'none', fontWeight: 800 }}>Tentar novamente</a>
          </>
        )}

        {result.connected && (
          <>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,.1)', color: '#10b981', border: '1px solid rgba(16,185,129,.35)', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800 }}>Conexão autorizada</div>
            <h2 style={{ fontSize: 22, marginBottom: 6 }}>{result.name || 'Conta TikTok conectada'}</h2>
            <p style={{ color: 'var(--text3)', marginTop: 0 }}>Os dados abaixo vieram da autorização do TikTok Sandbox.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 18 }}>
              <Stat label="Seguidores" value={result.followers || '—'} />
              <Stat label="Curtidas" value={result.likes || '—'} />
              <Stat label="Vídeos lidos" value={result.videos || '—'} />
              <Stat label="Verificado" value={result.verified === 'true' ? 'Sim' : result.verified === 'false' ? 'Não' : '—'} />
            </div>
            <div style={{ marginTop: 18, fontSize: 12, color: 'var(--text3)' }}>Escopos usados: user.info.profile · user.info.stats · video.list</div>
          </>
        )}
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string, value: string }) {
  return <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
    <div style={{ color: 'var(--text3)', fontSize: 11 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{value}</div>
  </div>
}

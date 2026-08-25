'use client'

export default function MetaAdsPage() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const connected = params.get('connected') === '1'
  const accounts = params.get('accounts')
  const accountName = params.get('account_name')
  const error = params.get('error')

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0, color: 'var(--text)' }}>Meta Ads — Integração</h1>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>Central da fonte Meta Ads para o MM Intelligence.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginBottom: 18 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}>Marketing API</strong>
            <span style={{ color: connected ? '#10b981' : '#f59e0b', border: `1px solid ${connected ? '#10b98155' : '#f59e0b55'}`, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>{connected ? 'CONECTADA' : 'CONFIGURAÇÃO'}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            <div>Permissões: <b style={{ color: 'var(--text)' }}>ads_read, ads_management, business_management</b></div>
            <div>Objetivo: <b style={{ color: 'var(--text)' }}>leitura e análise autorizada de anúncios</b></div>
            {connected && <div style={{ color: '#10b981', marginTop: 8 }}>✓ API validada{accounts ? ` · ${accounts} conta(s)` : ''}{accountName ? ` · ${accountName}` : ''}</div>}
            {error && <div style={{ color: '#ef4444', marginTop: 8 }}>Falha de conexão: {error}</div>}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <strong style={{ color: 'var(--text)' }}>{connected ? 'Meta Ads pronta' : 'Próximo passo'}</strong>
          <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6 }}>{connected ? 'A autorização respondeu pela Marketing API e uma consulta de contas de anúncios foi executada.' : 'Autorize o MM diretamente na Meta. O token é tratado somente pelo backend e não é exibido nesta página.'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {!connected && <a href="/api/auth/meta/start" style={{ textDecoration: 'none', color: '#fff', background: '#7c3aed', border: '1px solid #8b5cf6', borderRadius: 8, padding: '9px 12px', fontSize: 12, fontWeight: 700 }}>Conectar Meta Ads</a>}
        <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: '#111827', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Abrir Meta for Developers ↗</a>
        <a href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: '#111827', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Meta Ad Library US ↗</a>
      </div>
    </div>
  )
}

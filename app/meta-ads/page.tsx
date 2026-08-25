'use client'

import { useState } from 'react'

export default function MetaAdsPage() {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0, color: 'var(--text)' }}>Meta Ads — Integração</h1>
        <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 6 }}>
          Central da fonte Meta Ads para o MM Intelligence.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginBottom: 18 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <strong style={{ color: 'var(--text)' }}>Marketing API</strong>
            <span style={{ color: '#f59e0b', border: '1px solid #f59e0b55', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 }}>CONFIGURAÇÃO</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            <div>Permissões preparadas: <b style={{ color: 'var(--text)' }}>ads_read, ads_management, business_management</b></div>
            <div>Objetivo: <b style={{ color: 'var(--text)' }}>leitura e análise autorizada de anúncios</b></div>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <strong style={{ color: 'var(--text)' }}>Próximo passo</strong>
          <p style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.6 }}>
            Concluir a autenticação segura no backend do MM. Tokens não devem ser colados nem exibidos nesta página.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: '#111827', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Abrir Meta for Developers ↗</a>
        <a href="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#fff', background: '#111827', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>Meta Ad Library US ↗</a>
        <button onClick={() => setShowHelp(!showHelp)} style={{ color: 'var(--text)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 12, cursor: 'pointer' }}>Status da conexão</button>
      </div>

      {showHelp && <div style={{ marginTop: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, color: 'var(--text3)', fontSize: 12, lineHeight: 1.7 }}>
        A rota Meta Ads está instalada. A página não considera a fonte conectada apenas porque um token foi gerado no painel da Meta; a conexão será marcada como ativa somente depois da validação real pelo backend.
      </div>}
    </div>
  )
}

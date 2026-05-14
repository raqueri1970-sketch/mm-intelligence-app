'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { href: '/',             label: 'Dashboard',    icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )},
  { href: '/produtos',     label: 'Produtos',     icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  )},
  { href: '/radar',        label: 'Radar',        icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" opacity=".3"/>
      <path d="M12 6a6 6 0 100 12A6 6 0 0012 6z" opacity=".5"/>
    </svg>
  )},
  { href: '/tiktok',       label: 'TikTok',       externalHref: 'https://www.tiktok.com/explore', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.78a4.85 4.85 0 01-1.01-.09z"/>
    </svg>
  )},
  { href: '/meta-ads',     label: 'Meta Ads',     externalHref: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=video', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )},
  { href: '/concorrentes', label: 'Concorrentes', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )},
  { href: '/analytics',    label: 'Analytics',    icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )},
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [lang, setLang] = useState('pt')

  return (
    <>
      <aside className={collapsed ? 'mm-sidebar mm-sidebar--collapsed' : 'mm-sidebar'}>
        {/* Logo */}
        <div className="mm-logo">
          <div className="mm-logo__mark">MM</div>
          {!collapsed && (
            <div className="mm-logo__text">
              <span className="mm-logo__name">Intelligence</span>
              <span className="mm-logo__tag">Drop · AI · Score</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="mm-nav">
          {nav.map(({ href, label, icon, externalHref }) => {
            const isActive = path === href
            // TikTok e Meta Ads: clique vai para link externo, mas ativo quando na página interna
            if (externalHref) {
              return (
                <div key={href} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <Link href={href}
                    className={'mm-nav__item' + (isActive ? ' mm-nav__item--active' : '')}
                    style={{ flex: 1 }}>
                    <span className="mm-nav__icon">{icon}</span>
                    {!collapsed && <span className="mm-nav__label">{label}</span>}
                    {isActive && <span className="mm-nav__active-bar" />}
                  </Link>
                  {!collapsed && (
                    <a href={externalHref} target="_blank" rel="noopener noreferrer"
                      title={'Abrir ' + label + ' externo'}
                      style={{ padding: '6px 8px', color: 'var(--text3)', fontSize: 12, flexShrink: 0, transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--purple3)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                      ↗
                    </a>
                  )}
                </div>
              )
            }
            return (
              <Link key={href} href={href}
                className={'mm-nav__item' + (isActive ? ' mm-nav__item--active' : '')}>
                <span className="mm-nav__icon">{icon}</span>
                {!collapsed && <span className="mm-nav__label">{label}</span>}
                {isActive && <span className="mm-nav__active-bar" />}
              </Link>
            )
          })}
        </nav>

        {/* Idioma */}
        {!collapsed && (
          <div className="mm-lang">
            <span className="mm-lang__label">Idioma</span>
            <div className="mm-lang__pills">
              {[['pt','🇧🇷 PT'],['en','🇺🇸 EN'],['es','🇲🇽 ES']].map(([l, label]) => (
                <button key={l}
                  onClick={() => setLang(l)}
                  className={'mm-lang__pill' + (lang === l ? ' mm-lang__pill--active' : '')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="mm-collapse" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      <main className="mm-main">
        <header className="mm-topbar">
          <div className="mm-topbar__left">
            <span className="mm-topbar__path">
              {nav.find(n => n.href === path)?.label || 'MM Intelligence'}
            </span>
          </div>
          <div className="mm-topbar__right">
            <div className="mm-topbar__status">
              <span className="mm-pulse" />
              Minerador ativo
            </div>
            <div className="mm-topbar__stores">
              <span className="mm-store-badge mm-store-badge--mx">🇲🇽 MX</span>
              <span className="mm-store-badge mm-store-badge--us">🇺🇸 US</span>
              <span className="mm-store-badge mm-store-badge--br">🇧🇷 BR</span>
            </div>
          </div>
        </header>
        <div className="mm-content">{children}</div>
      </main>
    </>
  )
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type NavItem = { href: string; label: string; icon: React.ReactNode; externalHref?: string }
type NavGroup = { title?: string; color?: string; sub?: string; items: NavItem[] }

const SP = '#22d3ee' // ShopPainless
const SH = '#ee4d2d' // Shopee

const groups: NavGroup[] = [
  { items: [{ href: '/', label: 'Dashboard', icon: <span>▦</span> }] },
  {
    title: 'ShopPainless · Descoberta', color: SP, items: [
      { href: '/shoppainless', label: 'Visão geral', icon: <span style={{ color: SP }}>◈</span> },
      { href: '/vencedores', label: 'Radar MM', icon: <span style={{ color: '#34d399' }}>★</span> },
      { href: '/produtos', label: 'Produtos', icon: <span>▣</span> },
      { href: '/radar', label: 'Conselho MM', icon: <span>◎</span> },
      { href: '/analise', label: 'Pré-análise', icon: <span>✎</span> },
      { href: '/concorrentes', label: 'Concorrentes', icon: <span>♧</span> },
      { href: '/analytics', label: 'Analytics', icon: <span>▥</span> },
    ],
  },
  {
    sub: 'Fontes de sinal', color: SP, items: [
      { href: '/youtube', label: 'YouTube', icon: <span style={{ color: '#ff4d4d' }}>▶</span> },
      { href: '/tiktok', label: 'TikTok', externalHref: 'https://www.tiktok.com/explore', icon: <span>♪</span> },
      { href: '/amazon', label: 'Amazon', externalHref: 'https://www.amazon.com/', icon: <span>◉</span> },
      { href: '/meta-ads', label: 'Meta Ads', externalHref: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=video', icon: <span>●</span> },
    ],
  },
  {
    title: 'Shopee Afiliado', color: SH, items: [
      { href: '/shopee/afiliado', label: 'Primeiros passos', icon: <span style={{ color: SH }}>✓</span> },
      { href: '/shopee/minerador', label: 'Minerador', icon: <span style={{ color: SH }}>⛏</span> },
      { href: '/shopee', label: 'Radar de vídeos', icon: <span style={{ color: SH }}>◉</span> },
      { href: '/shopee/criativos', label: 'Criativos', icon: <span style={{ color: SH }}>✂</span> },
      { href: '/shopee/subid', label: 'Sub ID', icon: <span style={{ color: SH }}>#</span> },
      { href: '/shopee/relatorio', label: 'Relatório', icon: <span style={{ color: SH }}>$</span> },
      { href: '/shopee/vip', label: 'Grupo VIP', icon: <span style={{ color: SH }}>★</span> },
      { href: '/shopee/natal', label: 'Achados de Natal', icon: <span>🎄</span> },
      { href: '/shopee/tendencias', label: 'Em alta', icon: <span>🔥</span> },
      { href: '/shopee/instagram', label: 'Instagram', icon: <span>📸</span> },
    ],
  },
]

// Barra de abas do app no celular (PWA): o que se usa todo dia no Shopee Afiliado.
const TABS = [
  { href: '/shopee/vip', label: 'Hoje', icon: '★' },
  { href: '/shopee/natal', label: 'Natal', icon: '🎄' },
  { href: '/shopee/tendencias', label: 'Em alta', icon: '🔥' },
  { href: '/shopee/minerador', label: 'Buscar', icon: '🔍' },
  { href: '/shopee/relatorio', label: 'Ganhos', icon: 'R$' },
]

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

function crumb(path: string) {
  for (const g of groups) for (const n of g.items) if (n.href === path) {
    const section = g.title ?? (g.sub ? 'ShopPainless' : '')
    return section ? `${section.replace(' · Descoberta', '')} / ${n.label}` : n.label
  }
  return 'MM Intelligence'
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [lang, setLang] = useState('pt')
  const [menuOpen, setMenuOpen] = useState(false)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [iosTip, setIosTip] = useState(false)

  // App instalável: registra o service worker e oferece "Instalar" (Android/Chrome) ou a dica do iPhone.
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {})
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    const onPrompt = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent) }
    const onInstalled = () => setInstall(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    let dismissed = false
    try { dismissed = localStorage.getItem('mm-ios-tip') === '1' } catch {}
    if (!standalone && !dismissed && /iphone|ipad|ipod/i.test(navigator.userAgent)) setIosTip(true)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  const closeIosTip = () => { setIosTip(false); try { localStorage.setItem('mm-ios-tip', '1') } catch {} }
  async function doInstall() {
    if (!install) return
    await install.prompt()
    await install.userChoice.catch(() => null)
    setInstall(null)
  }

  // No celular o menu é uma gaveta: fecha ao trocar de página e trava o scroll do fundo enquanto aberto.
  useEffect(() => { setMenuOpen(false) }, [path])
  useEffect(() => {
    document.body.classList.toggle('mm-menu-open', menuOpen)
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('mm-menu-open') }
  }, [menuOpen])

  const item = (n: NavItem, nested: boolean) => {
    const active = path === n.href
    const link = (
      <Link key={n.href} href={n.href} className={'mm-nav__item' + (active ? ' mm-nav__item--active' : '')} style={collapsed ? undefined : { flex: 1, ...(nested ? { paddingLeft: 30, fontSize: 13 } : {}) }}>
        <span className="mm-nav__icon">{n.icon}</span>
        {!collapsed && <span className="mm-nav__label">{n.label}</span>}
        {active && <span className="mm-nav__active-bar" />}
      </Link>
    )
    if (!n.externalHref || collapsed) return link
    return <div key={n.href} style={{ display: 'flex', alignItems: 'center' }}>{link}<a href={n.externalHref} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 8px', color: 'var(--text3)', fontSize: 12 }}>↗</a></div>
  }

  return <>
    <aside id="mm-sidebar" className={'mm-sidebar' + (collapsed ? ' mm-sidebar--collapsed' : '') + (menuOpen ? ' mm-sidebar--open' : '')}>
      <div className="mm-logo"><div className="mm-logo__mark">MM</div>{!collapsed && <div className="mm-logo__text"><span className="mm-logo__name">Intelligence</span><span className="mm-logo__tag">Drop · AI · Score</span></div>}</div>
      <nav className="mm-nav" style={{ overflowY: 'auto' }}>
        {groups.map((g, gi) => (
          <div key={gi}>
            {(g.title || g.sub) && (collapsed
              ? <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />
              : <div style={{ padding: g.title ? '14px 18px 6px' : '8px 30px 4px', fontFamily: 'var(--mono)', fontSize: g.title ? 10 : 9, letterSpacing: '.08em', textTransform: 'uppercase', color: g.title ? g.color : 'var(--text3)' }}>{g.title ?? g.sub}</div>)}
            {g.items.map(n => item(n, Boolean(g.title || g.sub)))}
          </div>
        ))}
      </nav>
      {!collapsed && <div className="mm-lang"><span className="mm-lang__label">Idioma</span><div className="mm-lang__pills">{[['pt', '🇧🇷 PT'], ['en', '🇺🇸 EN'], ['es', '🇲🇽 ES']].map(([l, label]) => <button key={l} onClick={() => setLang(l)} className={'mm-lang__pill' + (lang === l ? ' mm-lang__pill--active' : '')}>{label}</button>)}</div></div>}
      <button className="mm-collapse" onClick={() => setCollapsed(!collapsed)}>{collapsed ? '›' : '‹'}</button>
    </aside>
    {menuOpen && <div className="mm-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    <main className="mm-main">
      <header className="mm-topbar">
        <div className="mm-topbar__left"><button type="button" className="mm-burger" onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="mm-sidebar">{menuOpen ? '✕' : '☰'}</button><span className="mm-topbar__path">{crumb(path)}</span></div>
        <div className="mm-topbar__right">{install && <button type="button" className="mm-install" onClick={doInstall}>⬇ Instalar app</button>}<div className="mm-topbar__status"><span className="mm-pulse" />Minerador ativo</div><div className="mm-topbar__stores"><span className="mm-store-badge mm-store-badge--mx">🇲🇽 MX</span><span className="mm-store-badge mm-store-badge--us">🇺🇸 US</span><span className="mm-store-badge mm-store-badge--br">🇧🇷 BR</span></div></div>
      </header>
      {iosTip && <div className="mm-iostip" role="note"><span>📲 Para instalar no iPhone: toque em <b>Compartilhar</b> <span aria-hidden="true">⎋</span> e depois em <b>Adicionar à Tela de Início</b>.</span><button type="button" onClick={closeIosTip} aria-label="Fechar dica">✕</button></div>}
      <div className="mm-content">{children}</div>
    </main>
    <nav className="mm-tabbar" aria-label="Atalhos do app">
      {TABS.map(t => {
        const on = path === t.href
        return <Link key={t.href} href={t.href} className={'mm-tabbar__item' + (on ? ' mm-tabbar__item--on' : '')} aria-current={on ? 'page' : undefined}><span className="mm-tabbar__icon">{t.icon}</span>{t.label}</Link>
      })}
      <button type="button" className={'mm-tabbar__item' + (menuOpen ? ' mm-tabbar__item--on' : '')} onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-controls="mm-sidebar"><span className="mm-tabbar__icon">☰</span>Menu</button>
    </nav>
  </>
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { href: '/', label: 'Dashboard', icon: <span>▦</span> },
  { href: '/produtos', label: 'Produtos', icon: <span>▣</span> },
  { href: '/radar', label: 'Radar', icon: <span>◎</span> },
  { href: '/youtube', label: 'YouTube', icon: <span style={{color:'#ff4d4d'}}>▶</span> },
  { href: '/tiktok', label: 'TikTok', externalHref: 'https://www.tiktok.com/explore', icon: <span>♪</span> },
  { href: '/amazon', label: 'Amazon', externalHref: 'https://www.amazon.com/', icon: <span>◉</span> },
  { href: '/meta-ads', label: 'Meta Ads', externalHref: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=video', icon: <span>●</span> },
  { href: '/concorrentes', label: 'Concorrentes', icon: <span>♧</span> },
  { href: '/analytics', label: 'Analytics', icon: <span>▥</span> },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [collapsed,setCollapsed]=useState(false); const [lang,setLang]=useState('pt')
  return <><aside className={collapsed?'mm-sidebar mm-sidebar--collapsed':'mm-sidebar'}><div className="mm-logo"><div className="mm-logo__mark">MM</div>{!collapsed&&<div className="mm-logo__text"><span className="mm-logo__name">Intelligence</span><span className="mm-logo__tag">Drop · AI · Score</span></div>}</div><nav className="mm-nav">{nav.map(({href,label,icon,externalHref})=>{const active=path===href;return externalHref?<div key={href} style={{display:'flex',alignItems:'center'}}><Link href={href} className={'mm-nav__item'+(active?' mm-nav__item--active':'')} style={{flex:1}}><span className="mm-nav__icon">{icon}</span>{!collapsed&&<span className="mm-nav__label">{label}</span>}{active&&<span className="mm-nav__active-bar"/>}</Link>{!collapsed&&<a href={externalHref} target="_blank" rel="noopener noreferrer" style={{padding:'6px 8px',color:'var(--text3)',fontSize:12}}>↗</a>}</div>:<Link key={href} href={href} className={'mm-nav__item'+(active?' mm-nav__item--active':'')}><span className="mm-nav__icon">{icon}</span>{!collapsed&&<span className="mm-nav__label">{label}</span>}{active&&<span className="mm-nav__active-bar"/>}</Link>})}</nav>{!collapsed&&<div className="mm-lang"><span className="mm-lang__label">Idioma</span><div className="mm-lang__pills">{[['pt','🇧🇷 PT'],['en','🇺🇸 EN'],['es','🇲🇽 ES']].map(([l,label])=><button key={l} onClick={()=>setLang(l)} className={'mm-lang__pill'+(lang===l?' mm-lang__pill--active':'')}>{label}</button>)}</div></div>}<button className="mm-collapse" onClick={()=>setCollapsed(!collapsed)}>{collapsed?'›':'‹'}</button></aside><main className="mm-main"><header className="mm-topbar"><div className="mm-topbar__left"><span className="mm-topbar__path">{nav.find(n=>n.href===path)?.label||'MM Intelligence'}</span></div><div className="mm-topbar__right"><div className="mm-topbar__status"><span className="mm-pulse"/>Minerador ativo</div><div className="mm-topbar__stores"><span className="mm-store-badge mm-store-badge--mx">🇲🇽 MX</span><span className="mm-store-badge mm-store-badge--us">🇺🇸 US</span><span className="mm-store-badge mm-store-badge--br">🇧🇷 BR</span></div></div></header><div className="mm-content">{children}</div></main></>
}

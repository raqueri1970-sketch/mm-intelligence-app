'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type NavItem = { href: string; label: string; icon: React.ReactNode; externalHref?: string; group?: boolean; child?: boolean }

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <span>▦</span> },
  { href: '/vencedores', label: 'Radar MM', icon: <span style={{color:'#34d399'}}>★</span> },
  { href: '/produtos', label: 'Produtos', icon: <span>▣</span> },
  { href: '/radar', label: 'Radar', icon: <span>◎</span> },
  { href: '/shopee/afiliado', label: 'Shopee Afiliado', group: true, icon: <span style={{color:'#ee4d2d'}}>S</span> },
  { href: '/shopee/afiliado', label: 'Primeiros passos', child: true, icon: <span style={{color:'#ee4d2d'}}>✓</span> },
  { href: '/shopee/minerador', label: 'Minerador', child: true, icon: <span style={{color:'#ee4d2d'}}>⛏</span> },
  { href: '/shopee', label: 'Radar de vídeos', child: true, icon: <span style={{color:'#ee4d2d'}}>◉</span> },
  { href: '/shopee/criativos', label: 'Criativos', child: true, icon: <span style={{color:'#ee4d2d'}}>✂</span> },
  { href: '/shopee/subid', label: 'Sub ID', child: true, icon: <span style={{color:'#ee4d2d'}}>#</span> },
  { href: '/youtube', label: 'YouTube', icon: <span style={{color:'#ff4d4d'}}>▶</span> },
  { href: '/tiktok', label: 'TikTok', externalHref: 'https://www.tiktok.com/explore', icon: <span>♪</span> },
  { href: '/amazon', label: 'Amazon', externalHref: 'https://www.amazon.com/', icon: <span>◉</span> },
  { href: '/meta-ads', label: 'Meta Ads', externalHref: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=video', icon: <span>●</span> },
  { href: '/concorrentes', label: 'Concorrentes', icon: <span>♧</span> },
  { href: '/analytics', label: 'Analytics', icon: <span>▥</span> },
]

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [collapsed,setCollapsed]=useState(false); const [lang,setLang]=useState('pt')
  return <><aside className={collapsed?'mm-sidebar mm-sidebar--collapsed':'mm-sidebar'}><div className="mm-logo"><div className="mm-logo__mark">MM</div>{!collapsed&&<div className="mm-logo__text"><span className="mm-logo__name">Intelligence</span><span className="mm-logo__tag">Drop · AI · Score</span></div>}</div><nav className="mm-nav">{nav.map(({href,label,icon,externalHref,group,child})=>{if(group)return collapsed?<div key={label} style={{height:1,background:'var(--border)',margin:'8px 10px'}}/>:<div key={label} style={{padding:'14px 18px 6px',fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:'#ee4d2d',display:'flex',gap:6,alignItems:'center'}}>{icon}{label}</div>;const active=path===href;if(child)return <Link key={href} href={href} className={'mm-nav__item'+(active?' mm-nav__item--active':'')} style={collapsed?undefined:{paddingLeft:30,fontSize:13}}><span className="mm-nav__icon">{icon}</span>{!collapsed&&<span className="mm-nav__label">{label}</span>}{active&&<span className="mm-nav__active-bar"/>}</Link>;return externalHref?<div key={href} style={{display:'flex',alignItems:'center'}}><Link href={href} className={'mm-nav__item'+(active?' mm-nav__item--active':'')} style={{flex:1}}><span className="mm-nav__icon">{icon}</span>{!collapsed&&<span className="mm-nav__label">{label}</span>}{active&&<span className="mm-nav__active-bar"/>}</Link>{!collapsed&&<a href={externalHref} target="_blank" rel="noopener noreferrer" style={{padding:'6px 8px',color:'var(--text3)',fontSize:12}}>↗</a>}</div>:<Link key={href} href={href} className={'mm-nav__item'+(active?' mm-nav__item--active':'')}><span className="mm-nav__icon">{icon}</span>{!collapsed&&<span className="mm-nav__label">{label}</span>}{active&&<span className="mm-nav__active-bar"/>}</Link>})}</nav>{!collapsed&&<div className="mm-lang"><span className="mm-lang__label">Idioma</span><div className="mm-lang__pills">{[['pt','🇧🇷 PT'],['en','🇺🇸 EN'],['es','🇲🇽 ES']].map(([l,label])=><button key={l} onClick={()=>setLang(l)} className={'mm-lang__pill'+(lang===l?' mm-lang__pill--active':'')}>{label}</button>)}</div></div>}<button className="mm-collapse" onClick={()=>setCollapsed(!collapsed)}>{collapsed?'›':'‹'}</button></aside><main className="mm-main"><header className="mm-topbar"><div className="mm-topbar__left"><span className="mm-topbar__path">{(()=>{const n=nav.find(n=>n.href===path&&!n.group);return n?(n.child?`Shopee Afiliado / ${n.label}`:n.label):'MM Intelligence'})()}</span></div><div className="mm-topbar__right"><div className="mm-topbar__status"><span className="mm-pulse"/>Minerador ativo</div><div className="mm-topbar__stores"><span className="mm-store-badge mm-store-badge--mx">🇲🇽 MX</span><span className="mm-store-badge mm-store-badge--us">🇺🇸 US</span><span className="mm-store-badge mm-store-badge--br">🇧🇷 BR</span></div></div></header><div className="mm-content">{children}</div></main></>
}

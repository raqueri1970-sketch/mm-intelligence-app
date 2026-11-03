'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import s from './shopee.module.css'

// Dados e utilitários compartilhados entre as páginas do menu Shopee Afiliado.

// Vídeos verificados um a um em 03/11/2026 (link abre o vídeo e as views foram lidas na própria página).
// Use o botão "VERIFICAR AGORA" no Radar para atualizar os números ao vivo.
export type RadarVideo={id:string;title:string;views:number;source:string;url:string;hook:string;why:string}
export const VERIFIED_AT='03/11/2026'
export const videos:RadarVideo[]=[
 {id:'ml-bOwdXh',title:'Hidrabene FPS 70 — clip toque seco',views:15956,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/bOwdXh/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'TOQUE SECO / ROTINA',why:'Maior clip verificado. Referência principal de abertura e ritmo.'},
 {id:'ml-333PDU',title:'Hidrabene FPS 70 — clip FPS + toque seco',views:11143,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/333PDU/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'FPS 70 + TOQUE SECO',why:'Segundo maior; mesmo ângulo com outra abertura.'},
 {id:'ml-fSiHBp',title:'Hidrabene FPS 70 — clip textura matte',views:5750,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/fSiHBp/hidrabene-protetor-solar-facial-clareador-fps-70-50g',hook:'TEXTURA + EFEITO MATTE',why:'Subiu muito desde a última coleta. Atenção: o anúncio usa "clareador" — não repita no seu texto.'},
 {id:'ml-JkBaGv',title:'Hidrabene FPS 70 — clip pele oleosa',views:4793,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/JkBaGv/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'PROTEÇÃO + PELE OLEOSA',why:'Outro ângulo de venda com volume razoável.'},
 {id:'ml-oxfduQ',title:'Hidrabene FPS 70 — clip rotina diária',views:2235,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/oxfduQ/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'ROTINA DIÁRIA',why:'Referência de estrutura curta.'},
 {id:'ml-cKObJl',title:'Hidrabene FPS 70 — clip benefício rápido',views:1730,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/cKObJl/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'BENEFÍCIO RÁPIDO',why:'Bom para comparar abertura e duração.'},
 {id:'ml-2TQx0v',title:'Hidrabene FPS 70 — clip cuidado diário',views:1578,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/2TQx0v/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'CUIDADO DIÁRIO',why:'Banco de cenas.'},
 {id:'ml-oBd2Zo',title:'Hidrabene FPS 70 — clip absorção',views:712,source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/oBd2Zo/hidrabene-protetor-solar-facial-clareador-fps-70-50g',hook:'ABSORÇÃO / MATTE',why:'Sinal fraco; só banco de cenas.'},
 {id:'tt-7685421543144295700',title:'TikTok @biaalcantaraoficial — protetor Hidrabene',views:380,source:'TikTok',url:'https://www.tiktok.com/@biaalcantaraoficial/video/7685421543144295700',hook:'INDICAÇÃO PESSOAL',why:'Vídeo de afiliada com link real. Views baixas — use como exemplo de formato, não de resultado.'},
 {id:'tt-7685924302427819282',title:'TikTok @_laraatilio — protetor solar Hidrabene',views:171,source:'TikTok',url:'https://www.tiktok.com/@_laraatilio/video/7685924302427819282',hook:'APLICAÇÃO NA PELE',why:'Demonstração simples de aplicação.'},
 {id:'tt-7686520217626856712',title:'TikTok @jamilah.fabres — Protetor FPS 70 Uniformizador',views:145,source:'TikTok',url:'https://www.tiktok.com/@jamilah.fabres/video/7686520217626856712',hook:'PRODUTO EXATO (FPS 70)',why:'Único vídeo do TikTok encontrado sobre o mesmo FPS 70.'},
]

// Números citados por terceiros SEM link do vídeo — não entram no ranking.
export const unlinkedRefs=[
 {label:'Maior vídeo de afiliado (protetor solar facial)',value:'2.481.170 views',source:'Artigo Nolyn, dados de 16/10/2026',url:'https://www.nolyn.ai/pt/case-studies/como-achar-afiliados-tiktok-shop'},
 {label:'Vídeo da própria marca',value:'4,1 mi views',source:'Artigo Nolyn, dados de 16/10/2026',url:'https://www.nolyn.ai/pt/case-studies/como-achar-afiliados-tiktok-shop'},
]
export const autoHooks=['Skincare disfarçado de protetor: FPS 70 com niacinamida','Se você odeia protetor grudento, olha essa textura','FPS 70 com toque seco: olha como ele some na pele','Pare de pagar caro só pela marca','O protetor que entra na rotina como skincare','3 dedos, espalhou, sumiu: proteção para o dia a dia']
export const BANNED=/clareamento|clareia|clareador|melasma|100%|n[aã]o precisa reaplicar/i

export type Product={id:number;name:string;shop:string;price:number;discount:number;sales:number;rating:number;commissionRate:number;commission:number;image:string;productLink:string;affiliateLink:string;score:number}

export const brl=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export const isVideoPage=(u:string)=>/tiktok\.com|mercadoli(v|b)re|instagram\.com|\.(mp4|mov|webm|m4v)(\?|$)/i.test(u)

export function saveBlob(blob:Blob,name:string){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}

export const KEYS={hooks:'mm-shopee-hooks',remixCount:'mm-shopee-remix-count',checklist:'mm-shopee-checklist'}

/** useState salvo no navegador (sobrevive à troca de página do menu). */
export function useLocal<T>(key:string,initial:T){
 const [v,setV]=useState<T>(initial)
 const [ready,setReady]=useState(false)
 useEffect(()=>{try{const r=localStorage.getItem(key);if(r!==null)setV(JSON.parse(r))}catch{}setReady(true)},[key])
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(key,JSON.stringify(v))}catch{}},[key,v,ready])
 return [v,setV,ready] as const
}

// Correções de ganchos já salvos no navegador (afirmações que não conseguimos comprovar).
const HOOK_FIXES:[RegExp,string][]=[[/FPS 70 \+ Niacinamida 5%/g,'FPS 70 com niacinamida']]

export function useHooks(){
 const [text,setText,ready]=useLocal<string>(KEYS.hooks,autoHooks.join('\n'))
 useEffect(()=>{if(!ready)return;const fixed=HOOK_FIXES.reduce((t,[re,to])=>t.replace(re,to),text);if(fixed!==text)setText(fixed)},[ready,text,setText])
 const hooks=text.split('\n').map(h=>h.trim()).filter(Boolean)
 return {text,setText,hooks,bad:hooks.filter(h=>BANNED.test(h)),ready}
}

export function useApiStatus(){
 const [st,setSt]=useState<'loading'|'on'|'off'>('loading')
 useEffect(()=>{fetch('/api/shopee/status').then(r=>r.json()).then(j=>setSt(j.configured?'on':'off')).catch(()=>setSt('off'))},[])
 return st
}

export const SHOPEE_TABS=[
 {href:'/shopee/afiliado',label:'Primeiros passos'},
 {href:'/shopee/minerador',label:'Minerador'},
 {href:'/shopee',label:'Radar de vídeos'},
 {href:'/shopee/criativos',label:'Criativos'},
 {href:'/shopee/subid',label:'Sub ID'},
]

export function ShopeeTabs(){
 const path=usePathname()
 return <nav className={s.tabs}>{SHOPEE_TABS.map((t,i)=><Link key={t.href} href={t.href} className={`${s.tab} ${path===t.href?s.tabOn:''}`}><span>{i+1}</span>{t.label}</Link>)}</nav>
}

export function ApiBadge(){
 const st=useApiStatus()
 return <span className={s.badge} style={st==='off'?{borderColor:'rgba(245,158,11,.45)',color:'#fbbf24',background:'rgba(245,158,11,.1)'}:undefined}>{st==='loading'?'API…':st==='on'?'API LIGADA':'API AGUARDANDO LIBERAÇÃO'}</span>
}

function QueryReaderInner({onQuery}:{onQuery:(p:URLSearchParams)=>void}){
 const sp=useSearchParams()
 const key=sp.toString()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{if(key)onQuery(new URLSearchParams(key))},[key])
 return null
}
/** Lê os parâmetros da URL (?links=, ?link=) com segurança na navegação pelo menu. */
export function QueryReader({onQuery}:{onQuery:(p:URLSearchParams)=>void}){
 return <Suspense fallback={null}><QueryReaderInner onQuery={onQuery}/></Suspense>
}

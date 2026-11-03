'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import s from './shopee.module.css'

// Dados e utilitários compartilhados entre as páginas do menu Shopee Afiliado.

export const videos=[
 {rank:1,title:'TikTok — vídeo de afiliado líder encontrado',views:'2,48 mi',source:'TikTok / pesquisa pública',url:'https://www.nolyn.ai/pt/case-studies/como-achar-afiliados-tiktok-shop',hook:'PROVA + CURIOSIDADE',why:'Maior vídeo de afiliado localizado na amostra pública. Use como referência de ritmo e abertura.'},
 {rank:2,title:'TikTok — vídeo da própria Hidrabene',views:'4,1 mi',source:'TikTok / pesquisa pública',url:'https://www.nolyn.ai/pt/case-studies/como-achar-afiliados-tiktok-shop',hook:'DEMONSTRAÇÃO DA MARCA',why:'A conta oficial teve milhões de visualizações; referência forte para demonstração do produto.'},
 {rank:3,title:'Hidrabene FPS 70 — Short 11,5 mil',views:'11.560',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/bOwdXh/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'TOQUE SECO / ROTINA',why:'Melhor clip individual que conseguimos abrir e medir diretamente.'},
 {rank:4,title:'Hidrabene FPS 70 — Short 7,8 mil',views:'7.838',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/333PDU/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'FPS 70 + TOQUE SECO',why:'Boa tração entre os clips públicos encontrados.'},
 {rank:5,title:'Hidrabene FPS 70 — Short 4,1 mil',views:'4.185',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/JkBaGv/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'PROTEÇÃO + PELE OLEOSA',why:'Mostra outro ângulo de venda e mantém volume razoável.'},
 {rank:6,title:'Hidrabene FPS 70 — Short 2,2 mil',views:'2.233',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/oxfduQ/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'ROTINA DIÁRIA',why:'Referência adicional de estrutura curta.'},
 {rank:7,title:'Hidrabene FPS 70 — Short 1,7 mil',views:'1.725',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/cKObJl/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'BENEFÍCIO RÁPIDO',why:'Útil para comparar abertura e duração.'},
 {rank:8,title:'Hidrabene FPS 70 — Short 1,6 mil',views:'1.632',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/fSiHBp/hidrabene-protetor-solar-facial-clareador-fps-70-50g',hook:'TEXTURA + EFEITO MATTE',why:'Boa referência visual; adapte o texto às regras atuais da marca.'},
 {rank:9,title:'Hidrabene FPS 70 — Short 1,4 mil',views:'1.435',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/2TQx0v/hidrabene-protetor-facial-solar-fps-70-toque-seco',hook:'CUIDADO DIÁRIO',why:'Referência recente encontrada em outubro.'},
 {rank:10,title:'Hidrabene FPS 70 — Short 710',views:'710',source:'Mercado Livre Clips',url:'https://www.mercadolivre.com.br/shorts/clips/oBd2Zo/hidrabene-protetor-solar-facial-clareador-fps-70-50g',hook:'ABSORÇÃO / MATTE',why:'Menor sinal; fica no banco para cenas, não como modelo principal.'}
]
export const autoHooks=['Skincare disfarçado de protetor: FPS 70 + Niacinamida 5%','Se você odeia protetor grudento, olha essa textura','FPS 70 com toque seco: olha como ele some na pele','Pare de pagar caro só pela marca','O protetor que entra na rotina como skincare','3 dedos, espalhou, sumiu: proteção para o dia a dia']
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

export function useHooks(){
 const [text,setText,ready]=useLocal<string>(KEYS.hooks,autoHooks.join('\n'))
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

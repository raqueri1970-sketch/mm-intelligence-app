'use client'
import { useEffect, useMemo, useState } from 'react'
import s from './shopee.module.css'
import { remix, type RemixResult } from './remixer'

const videos=[
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
const autoHooks=['Skincare disfarçado de protetor: FPS 70 + Niacinamida 5%','Se você odeia protetor grudento, olha essa textura','FPS 70 com toque seco: olha como ele some na pele','Pare de pagar caro só pela marca','O protetor que entra na rotina como skincare','3 dedos, espalhou, sumiu: proteção para o dia a dia']
const BANNED=/clareamento|clareia|clareador|melasma|100%|n[aã]o precisa reaplicar/i

type Job={url:string;status:'wait'|'ok'|'err';msg:string}
type Product={id:number;name:string;shop:string;price:number;discount:number;sales:number;rating:number;commissionRate:number;commission:number;image:string;productLink:string;affiliateLink:string;score:number}

const brl=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const isVideoPage=(u:string)=>/tiktok\.com|mercadoli(v|b)re|instagram\.com|\.(mp4|mov|webm|m4v)(\?|$)/i.test(u)

function saveBlob(blob:Blob,name:string){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}

export default function ShopeePage(){
 const [files,setFiles]=useState<File[]>([])
 const [links,setLinks]=useState('')
 const [jobs,setJobs]=useState<Job[]>([])
 const [busy,setBusy]=useState(false)
 const [rights,setRights]=useState(false)
 const [saveCopy,setSaveCopy]=useState(true)
 const [hooksText,setHooksText]=useState(autoHooks.join('\n'))
 const [count,setCount]=useState(10),[seconds,setSeconds]=useState(20),[cta,setCta]=useState('Link na bio • carrinho laranja')
 const [progress,setProgress]=useState(''),[results,setResults]=useState<RemixResult[]>([]),[remixing,setRemixing]=useState(false)
 const [q,setQ]=useState(''),[sort,setSort]=useState('2'),[products,setProducts]=useState<Product[]>([]),[mineMsg,setMineMsg]=useState(''),[mining,setMining]=useState(false)

 useEffect(()=>{try{setRights(localStorage.getItem('mm-video-rights')==='1')}catch{}},[])
 function toggleRights(v:boolean){setRights(v);try{localStorage.setItem('mm-video-rights',v?'1':'0')}catch{}}

 const previews=useMemo(()=>files.map(f=>URL.createObjectURL(f)),[files])
 useEffect(()=>()=>previews.forEach(u=>URL.revokeObjectURL(u)),[previews])
 const hooks=hooksText.split('\n').map(h=>h.trim()).filter(Boolean)
 const badHooks=hooks.filter(h=>BANNED.test(h))

 function addFiles(list:FileList|File[]|null){if(list)setFiles(v=>[...v,...Array.from(list)].slice(0,30))}

 async function downloadOne(url:string):Promise<Job>{
  try{
   const r=await fetch(`/api/video/download?url=${encodeURIComponent(url)}`)
   if(!r.ok){const j=await r.json().catch(()=>({error:`Erro ${r.status}`}));return{url,status:'err',msg:j.error}}
   const blob=await r.blob()
   const name=(r.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1])||'video.mp4'
   const title=decodeURIComponent(r.headers.get('x-video-title')||name)
   addFiles([new File([blob],name,{type:blob.type||'video/mp4'})])
   if(saveCopy)saveBlob(blob,name)
   return{url,status:'ok',msg:`${(blob.size/1048576).toFixed(1)} MB • ${title.slice(0,70)}`}
  }catch(e){return{url,status:'err',msg:e instanceof Error?e.message:'Falha'}}
 }

 async function downloadAll(list:string[]){
  const urls=[...new Set(list.map(l=>l.trim()).filter(Boolean))]
  if(!urls.length)return
  if(!rights){setJobs([{url:'',status:'err',msg:'Marque a confirmação de autorização antes de baixar.'}]);return}
  setBusy(true)
  setJobs(urls.map(url=>({url,status:'wait',msg:'baixando...'})))
  for(let i=0;i<urls.length;i++){ // um por vez para não ser bloqueado
   const res=await downloadOne(urls[i])
   setJobs(j=>j.map((x,k)=>k===i?res:x))
  }
  setBusy(false)
 }

 async function runRemix(){
  setRemixing(true);setResults([]);setProgress('')
  try{setResults(await remix(files,{hooks,count,targetSeconds:seconds,cta,onProgress:setProgress}))}
  catch(e){setProgress(e instanceof Error?e.message:'Falha no remix')}
  setRemixing(false)
 }

 async function mine(){
  if(!q.trim())return
  setMining(true);setMineMsg('');setProducts([])
  try{const r=await fetch(`/api/shopee/products?q=${encodeURIComponent(q)}&sort=${sort}`);const j=await r.json()
   if(!r.ok)setMineMsg(j.error);else{setProducts(j.items);if(!j.items.length)setMineMsg('Nenhum produto encontrado.')}}
  catch{setMineMsg('Falha ao consultar a Shopee.')}
  setMining(false)
 }

 return <div className={s.page}>
  <div className={s.head}><h1>Shopee — Radar de Vídeos Vencedores</h1><p>Mineramos produtos, baixamos as referências, escolhemos ganchos e montamos os criativos.</p></div>
  <div className={s.stats}>
   <div className={s.stat}><span>Produto</span><strong>Hidrabene</strong><small>FPS 70</small></div>
   <div className={s.stat}><span>TikTok produto</span><strong>30,88 mi</strong><small>views agregadas estimadas</small></div>
   <div className={s.stat}><span>Vídeos mapeados</span><strong>4.080</strong><small>TokDataPRO</small></div>
   <div className={s.stat}><span>Saturação</span><strong>88/100</strong><small>precisa diferenciar gancho</small></div>
  </div>

  {/* 1. MINERADOR */}
  <section className={s.panel}>
   <div className={s.panelHead}><div><h2>Minerador Shopee</h2><p>Busca na API oficial de afiliados: mais vendidos, comissão em R$ e seu link de afiliado pronto.</p></div><span className={s.badge}>API AFILIADOS</span></div>
   <div className={s.row}>
    <input className={`${s.input} ${s.grow}`} value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&mine()} placeholder="ex: protetor solar facial, mini processador, escova secadora"/>
    <select className={s.select} value={sort} onChange={e=>setSort(e.target.value)}><option value="2">Mais vendidos</option><option value="5">Maior comissão</option><option value="1">Relevância</option></select>
    <button className={s.btn} onClick={mine} disabled={mining||!q.trim()}>{mining?'MINERANDO...':'MINERAR'}</button>
   </div>
   {mineMsg&&<div className={`${s.hint} ${s.err}`}>{mineMsg}</div>}
   {products.length>0&&<div className={s.tableWrap}><table className={s.table}><thead><tr><th>Score</th><th></th><th>Produto</th><th>Preço</th><th>Vendas</th><th>Nota</th><th>Comissão</th><th>Link</th></tr></thead><tbody>
    {products.map(p=><tr key={p.id}><td className={s.score}>{p.score}</td><td>{p.image&&<img src={p.image} alt=""/>}</td><td>{p.name}<small style={{display:'block',color:'var(--text3)'}}>{p.shop}</small></td><td>{brl(p.price)}</td><td>{p.sales.toLocaleString('pt-BR')}</td><td>{p.rating.toFixed(1)}</td><td>{brl(p.commission)}<small style={{display:'block',color:'var(--text3)'}}>{p.commissionRate.toFixed(1)}%</small></td>
     <td><div className={s.actions}><button className={`${s.btn} ${s.btnGhost}`} onClick={()=>navigator.clipboard.writeText(p.affiliateLink)}>COPIAR</button><button className={`${s.btn} ${s.btnGhost}`} onClick={()=>{setQ(p.name);window.open(`https://www.tiktok.com/search/video?q=${encodeURIComponent(p.name.split(' ').slice(0,5).join(' '))}`,'_blank','noopener')}}>VÍDEOS ↗</button></div></td></tr>)}
   </tbody></table></div>}
  </section>

  {/* 2. DOWNLOAD */}
  <section className={s.panel}>
   <div className={s.panelHead}><div><h2>Baixar vídeos pelo link</h2><p>Cole links do TikTok, Mercado Livre Clips, Instagram ou .mp4 — um por linha. Baixa sozinho e já entra no banco de produção.</p></div><span className={s.badge}>AUTOMÁTICO</span></div>
   <textarea className={s.textarea} value={links} onChange={e=>setLinks(e.target.value)} placeholder={'https://www.tiktok.com/@loja/video/123...\nhttps://vm.tiktok.com/ZMxxxx/\nhttps://www.mercadolivre.com.br/shorts/clips/...'}/>
   <label className={s.check}><input type="checkbox" checked={rights} onChange={e=>toggleRights(e.target.checked)}/>Confirmo que os vídeos são meus, da marca/vendedor com autorização, ou que vou usar só como referência de roteiro. Repostar vídeo de outro criador derruba alcance e pode banir a conta.</label>
   <label className={s.check}><input type="checkbox" checked={saveCopy} onChange={e=>setSaveCopy(e.target.checked)}/>Também salvar uma cópia no computador</label>
   <div className={s.row} style={{marginTop:12}}><button className={s.btn} disabled={busy||!links.trim()} onClick={()=>downloadAll(links.split('\n'))}>{busy?'BAIXANDO...':'BAIXAR TODOS ↓'}</button></div>
   {jobs.length>0&&<div className={s.jobs}>{jobs.map((j,i)=><div key={i} className={s.job}><code title={j.url}>{j.url||'—'}</code><span className={s[j.status]}>{j.status==='ok'?'✓ ':j.status==='err'?'✕ ':'… '}{j.msg}</span></div>)}</div>}
   <p className={s.hint}>YouTube não é suportado. O vídeo do TikTok vem no arquivo oficial de download (com o crédito do criador).</p>
  </section>

  {/* 3. TOP 10 */}
  <section className={s.panel}>
   <div className={s.panelHead}><div><h2>TOP 10 — vídeos do produto</h2><p>Ordenados pelos melhores sinais públicos verificados. Abra para estudar gancho, cena e ritmo.</p></div>
    <button className={s.btn} disabled={busy} onClick={()=>downloadAll(videos.filter(v=>isVideoPage(v.url)).map(v=>v.url))}>BAIXAR TODOS DA LISTA ↓</button></div>
   <div className={s.list}>{videos.map(v=><div key={v.rank} className={s.item}>
    <b className={s.rank}>#{v.rank}</b>
    <div><b>{v.title}</b><small>{v.source} • Gancho: {v.hook}</small><small>{v.why}</small></div>
    <div className={s.views}><b>{v.views}</b><span>visualizações</span></div>
    <div className={s.actions}><a className={`${s.btn} ${s.btnGhost}`} href={v.url} target="_blank" rel="noopener noreferrer">ABRIR ↗</a>
     {isVideoPage(v.url)&&<button className={s.btn} disabled={busy} onClick={()=>downloadAll([v.url])}>BAIXAR ↓</button>}</div>
   </div>)}</div>
  </section>

  {/* 4. GANCHOS */}
  <section className={s.panel}>
   <div className={s.panelHead}><div><h2>Ganchos</h2><p>Um por linha. Cada vídeo remixado abre com um gancho diferente escrito na tela.</p></div></div>
   <textarea className={s.textarea} style={{minHeight:150,fontFamily:'var(--font)'}} value={hooksText} onChange={e=>setHooksText(e.target.value)}/>
   {badHooks.length>0&&<div className={`${s.hint} ${s.err}`}>⚠ Termos proibidos (compliance) em: {badHooks.join(' • ')}</div>}
  </section>

  {/* 5. BANCO + REMIX */}
  <section className={s.panel}>
   <div className={s.panelHead}><div><h2>Banco para produção + Remix</h2><p>Os vídeos baixados entram aqui. O remix monta vídeos novos: gancho (3s) + trechos dos outros vídeos + CTA final, em 9:16.</p></div><span className={s.badge}>{files.length} VÍDEOS</span></div>
   <label className={s.drop} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files)}}><b>＋ ADICIONAR VÍDEOS</b><div style={{color:'var(--text3)',marginTop:5,fontSize:13}}>Arraste ou clique • MP4, MOV ou WEBM • até 30 arquivos</div><input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={e=>addFiles(e.target.files)} style={{display:'none'}}/></label>
   {files.length>0&&<div className={s.grid}>{files.map((f,i)=><div key={f.name+i} className={s.thumb}><video src={previews[i]} controls muted/><b title={f.name}>{f.name}</b><button className={s.remove} onClick={()=>setFiles(v=>v.filter((_,k)=>k!==i))}>✕</button></div>)}</div>}
   <div className={s.settings}>
    <label>Quantos vídeos<input className={s.input} type="number" min={1} max={30} value={count} onChange={e=>setCount(Math.max(1,Math.min(30,+e.target.value||1)))}/></label>
    <label>Duração (segundos)<input className={s.input} type="number" min={8} max={60} value={seconds} onChange={e=>setSeconds(Math.max(8,Math.min(60,+e.target.value||20)))}/></label>
    <label>Texto final (CTA)<input className={s.input} value={cta} onChange={e=>setCta(e.target.value)}/></label>
   </div>
   <div className={s.row} style={{marginTop:12}}>
    <button className={s.btn} disabled={remixing||files.length<2||badHooks.length>0} onClick={runRemix}>{remixing?'GERANDO...':`GERAR ${count} VÍDEOS`}</button>
    {results.length>0&&<button className={`${s.btn} ${s.btnGhost}`} onClick={()=>results.forEach((r,i)=>setTimeout(()=>saveBlob(r.blob,r.name),i*400))}>BAIXAR TODOS OS REMIX ↓</button>}
   </div>
   <p className={s.hint}>O remix roda no seu navegador em tempo real (≈ {Math.max(1,Math.ceil(count*seconds/60))} min para {count} vídeos). Deixe esta aba aberta e em primeiro plano. Use Chrome ou Edge.</p>
   {progress&&<div className={s.progress}>{progress}</div>}
   {results.length>0&&<div className={s.grid}>{results.map(r=><div key={r.name} className={s.thumb}><video src={r.url} controls/><b>{r.name}</b><small style={{fontSize:10,color:'var(--text3)',display:'block'}}>{r.recipe}</small><a className={`${s.btn} ${s.btnGhost}`} style={{display:'block',textAlign:'center',marginTop:6}} href={r.url} download={r.name}>BAIXAR</a></div>)}</div>}
  </section>

  <section className={s.panel}><h2 style={{fontSize:18}}>Regra de compliance</h2><p className={s.hint} style={{fontSize:13,color:'var(--text2)'}}>Bloquear no texto publicitário: “clareamento”, “clareia”, “clareador”, cura de melasma, proteção 100% e promessa de não reaplicar.</p></section>
 </div>
}

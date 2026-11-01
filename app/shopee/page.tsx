'use client'
import {useMemo,useState} from 'react'

const hooks=[
 'Skincare disfarçado de protetor — FPS 70 + Niacinamida 5%',
 'Textura de nuvem — toque seco para quem odeia protetor grudento',
 'Sem rastro branco — demonstração real na pele',
 'Pare de rasgar dinheiro — compare proteção e preço',
 'O Escudo FPS 70 — proteção alta para o dia a dia',
 'Não arde o olho — conforto na aplicação',
 'Aquele protetor que dá vontade de passar — ASMR sensorial',
 'Arrume-se comigo — regra dos 3 dedos e rotina da manhã'
]
const refs=[
 {title:'Biblioteca oficial Afiliada Elite',url:'https://hidrabene-afiliadaselite.com/'},
 {title:'Hidrabene FPS 70 — página oficial',url:'https://hidrabene.com.br/products/protetor-solar-facial-fps-70-clareador'},
 {title:'Referência em vídeo — YouTube',url:'https://www.youtube.com/watch?v=we_0Z75Exxg'}
]
export default function ShopeePage(){
 const [files,setFiles]=useState<File[]>([]); const [selected,setSelected]=useState<number[]>([0,1,2]); const [voice,setVoice]=useState('Feminina natural'); const [duration,setDuration]=useState('15–20s');
 const total=useMemo(()=>files.reduce((n,f)=>n+f.size,0),[files]);
 function addFiles(list:FileList|null){if(!list)return;setFiles(v=>[...v,...Array.from(list)].slice(0,20))}
 function toggle(i:number){setSelected(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i])}
 return <div>
  <div className="page-head"><div><h1>Shopee — Estúdio de Criativos</h1><p>Envie seus vídeos → selecione ganchos → misture cenas → adicione voz → gere variações.</p></div></div>
  <div className="stat-grid"><div className="stat-card"><span className="stat-label">Vídeos carregados</span><strong>{files.length}</strong><small>{(total/1024/1024).toFixed(1)} MB nesta sessão</small></div><div className="stat-card"><span className="stat-label">Ganchos escolhidos</span><strong>{selected.length}</strong><small>1 versão por gancho</small></div><div className="stat-card"><span className="stat-label">Voz</span><strong>ON</strong><small>{voice}</small></div><div className="stat-card"><span className="stat-label">Formato</span><strong>9:16</strong><small>{duration}</small></div></div>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>1. Coloque os vídeos aqui</h2><p>MP4, MOV ou WEBM. Você pode selecionar vários vídeos de uma vez.</p></div><span className="badge badge--green">ENTRADA</span></div>
   <label style={{display:'block',border:'2px dashed var(--border)',borderRadius:16,padding:28,textAlign:'center',cursor:'pointer'}}><div style={{fontSize:38}}>＋</div><b>CLIQUE PARA ADICIONAR VÍDEOS</b><div style={{opacity:.7,marginTop:6}}>Os arquivos ficam disponíveis para escolher cenas e montar novas versões.</div><input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={e=>addFiles(e.target.files)} style={{display:'none'}}/></label>
   {files.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:12,marginTop:16}}>{files.map((f,i)=><div key={f.name+i} style={{border:'1px solid var(--border)',borderRadius:12,padding:10}}><video src={URL.createObjectURL(f)} controls muted style={{width:'100%',height:250,objectFit:'cover',borderRadius:9,background:'#000'}}/><b style={{display:'block',marginTop:7,overflow:'hidden',textOverflow:'ellipsis'}}>{i+1}. {f.name}</b><button onClick={()=>setFiles(v=>v.filter((_,x)=>x!==i))} style={{marginTop:7}}>REMOVER</button></div>)}</div>}
  </section>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>2. Escolha os ganchos</h2><p>O sistema deve criar uma versão diferente para cada gancho selecionado.</p></div></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:10}}>{hooks.map((h,i)=><label key={h} style={{padding:14,border:'1px solid var(--border)',borderRadius:12,cursor:'pointer'}}><input type="checkbox" checked={selected.includes(i)} onChange={()=>toggle(i)}/> <b>{i+1}. {h}</b></label>)}</div>
  </section>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>3. Voz + montagem</h2><p>Configuração do criativo final.</p></div></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}><label>Voz<br/><select value={voice} onChange={e=>setVoice(e.target.value)} style={{width:'100%',marginTop:7,padding:10}}><option>Feminina natural</option><option>Masculina natural</option><option>Sem voz</option></select></label><label>Duração<br/><select value={duration} onChange={e=>setDuration(e.target.value)} style={{width:'100%',marginTop:7,padding:10}}><option>15–20s</option><option>20–30s</option><option>30–45s</option></select></label><div><b>Montagem automática</b><p style={{opacity:.75}}>Cortes rápidos • cenas misturadas • texto na tela • CTA final • 9:16.</p></div></div>
   <div style={{marginTop:16,padding:16,border:'1px solid var(--border)',borderRadius:12}}><b>Fila de produção</b><p>{files.length===0?'Adicione vídeos para liberar a produção.':`${files.length} vídeos prontos para combinar em ${selected.length} variações.`}</p><button disabled={files.length===0||selected.length===0} title="O renderizador/voz será conectado na próxima etapa" style={{padding:'12px 18px',fontWeight:800}}>GERAR {selected.length} CRIATIVOS COM VOZ</button><small style={{display:'block',marginTop:8,opacity:.65}}>Upload, prévia e configuração já funcionam. O botão de renderização precisa do motor de vídeo/voz no servidor para gerar o MP4 final.</small></div>
  </section>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Banco de vídeos / referências</h2><p>Material para buscar cenas e inspiração. Reutilize somente conteúdo autorizado.</p></div></div>{refs.map(r=><p key={r.url}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title} ↗</a></p>)}</section>
  <section className="panel" style={{marginTop:18}}><h2>Regra automática Hidrabene</h2><p><b>Bloquear no texto publicitário:</b> clareamento, clareia, clareador; cura de melasma; proteção 100%; promessa de não reaplicar. Não alterar a textura real da pele com IA.</p></section>
 </div>
}
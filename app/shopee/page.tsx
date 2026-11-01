'use client'
import {useState} from 'react'

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
const autoHooks=[
 'Skincare disfarçado de protetor: FPS 70 + Niacinamida 5%',
 'Se você odeia protetor grudento, olha essa textura',
 'FPS 70 com toque seco: olha como ele some na pele',
 'Pare de pagar caro só pela marca',
 'O protetor que entra na rotina como skincare',
 '3 dedos, espalhou, sumiu: proteção para o dia a dia'
]
export default function ShopeePage(){
 const [files,setFiles]=useState<File[]>([])
 function addFiles(list:FileList|null){if(list)setFiles(v=>[...v,...Array.from(list)].slice(0,30))}
 return <div>
  <div className="page-head"><div><h1>Shopee — Radar de Vídeos Vencedores</h1><p>Primeiro analisamos o que já teve audiência. Depois criamos ganchos e versões próprias.</p></div></div>
  <div className="stat-grid"><div className="stat-card"><span className="stat-label">Produto</span><strong>Hidrabene</strong><small>FPS 70</small></div><div className="stat-card"><span className="stat-label">TikTok produto</span><strong>30,88 mi</strong><small>views agregadas estimadas</small></div><div className="stat-card"><span className="stat-label">Vídeos mapeados</span><strong>4.080</strong><small>TokDataPRO</small></div><div className="stat-card"><span className="stat-label">Saturação</span><strong>88/100</strong><small>precisa diferenciar gancho</small></div></div>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>TOP 10 — vídeos do produto</h2><p>Ordenados pelos melhores sinais públicos que conseguimos verificar. Abra, assista e use os primeiros como referência.</p></div><span className="badge badge--green">PESQUISADO</span></div>
   <div style={{display:'grid',gap:10}}>{videos.map(v=><div key={v.rank} style={{display:'grid',gridTemplateColumns:'52px minmax(220px,1fr) 110px 180px',gap:12,alignItems:'center',padding:'14px',border:'1px solid var(--border)',borderRadius:12}}><b style={{fontSize:22}}>#{v.rank}</b><div><b>{v.title}</b><div style={{opacity:.7,fontSize:13,marginTop:4}}>{v.source} • Gancho observado: {v.hook}</div><div style={{fontSize:13,marginTop:5}}>{v.why}</div></div><div><b>{v.views}</b><div style={{fontSize:12,opacity:.65}}>visualizações</div></div><a href={v.url} target="_blank" rel="noopener noreferrer" style={{padding:'10px 12px',border:'1px solid var(--border)',borderRadius:9,textAlign:'center'}}>ABRIR VÍDEO ↗</a></div>)}</div>
   <p style={{opacity:.65,fontSize:12,marginTop:12}}>Nota: os dois primeiros números de TikTok vêm de uma pesquisa pública que mediu resultados de afiliados; o link abre a análise que documenta os resultados. Os clips individuais abaixo têm página pública verificável. Métricas mudam com o tempo.</p>
  </section>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Ganchos escolhidos pelo radar</h2><p>Não precisa preencher manualmente: estes ângulos foram derivados dos vídeos/sinais mais fortes e das regras oficiais do produto.</p></div></div>{autoHooks.map((h,i)=><div key={h} style={{padding:'11px 13px',margin:'7px 0',border:'1px solid var(--border)',borderRadius:10}}><b>{i+1}. {h}</b></div>)}</section>

  <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Banco para produção</h2><p>Baixe apenas material que você tem autorização para reutilizar e coloque os arquivos aqui. O estúdio poderá misturar cenas e criar versões próprias.</p></div></div>
   <label style={{display:'block',border:'2px dashed var(--border)',borderRadius:16,padding:25,textAlign:'center',cursor:'pointer'}}><b>＋ ADICIONAR VÍDEOS AUTORIZADOS</b><div style={{opacity:.7,marginTop:5}}>MP4, MOV ou WEBM • até 30 arquivos</div><input type="file" accept="video/mp4,video/quicktime,video/webm" multiple onChange={e=>addFiles(e.target.files)} style={{display:'none'}}/></label>
   {files.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:14}}>{files.map((f,i)=><div key={f.name+i} style={{border:'1px solid var(--border)',borderRadius:10,padding:8}}><video src={URL.createObjectURL(f)} controls muted style={{width:'100%',height:220,objectFit:'cover',background:'#000',borderRadius:8}}/><b style={{fontSize:12}}>{f.name}</b></div>)}</div>}
  </section>

  <section className="panel" style={{marginTop:18}}><h2>Leitura do produto</h2><p><b>Demanda existe:</b> dezenas de milhões de visualizações e dezenas de milhares de vendas recentes. <b>Problema:</b> saturação alta. Portanto, copiar um criativo comum é fraco; precisamos recombinar cenas autorizadas e testar aberturas diferentes.</p><p><b>Regra de compliance:</b> no nosso texto publicitário bloquear “clareamento”, “clareia” e “clareador”, cura de melasma, proteção 100% e promessa de não reaplicar.</p></section>
 </div>
}
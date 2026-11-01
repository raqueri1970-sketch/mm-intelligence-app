const photos=[
 {src:'https://hidrabene.com.br/cdn/shop/files/Protetor70FPS.png?v=1784820958',label:'Produto em textura'},
 {src:'https://hidrabene.com.br/cdn/shop/files/UltraleveFPS70-03.jpg?v=1771959530',label:'Produto na mão'},
 {src:'https://drogariavenancio.vtexassets.com/arquivos/ids/1291352/99731_z.jpg?v=638895946852430000',label:'Produto fundo branco'}
]
const videos=[
 {title:'Vídeo do produto — YouTube',url:'https://www.youtube.com/watch?v=we_0Z75Exxg',source:'YouTube'},
 {title:'Vídeo FPS 70 — YouTube',url:'https://www.youtube.com/watch?v=QQ1TpphbuUs',source:'YouTube'},
 {title:'Biblioteca oficial Afiliada Elite — vídeos e treinamentos',url:'https://hidrabene-afiliadaselite.com/',source:'Hidrabene'},
 {title:'Página oficial — fotos e vídeos de clientes',url:'https://hidrabene.com.br/products/protetor-solar-facial-fps-70-clareador',source:'Hidrabene'}
]
const hooks=['FPS 70 + rotina de skincare','Toque seco e efeito matte','Textura leve e rápida absorção','Proteção alta para uso diário','Niacinamida + proteção solar']
export default function ShopeePage(){return <div>
 <div className="page-head"><div><h1>Shopee — Afiliados & Criativos</h1><p>Área prática: fotos, vídeos, fontes e criativos para publicar.</p></div></div>
 <div className="stat-grid"><div className="stat-card"><span className="stat-label">Produto</span><strong>Hidrabene</strong><small>FPS 70</small></div><div className="stat-card"><span className="stat-label">Fotos disponíveis</span><strong>{photos.length}</strong><small>abrir / baixar</small></div><div className="stat-card"><span className="stat-label">Fontes de vídeo</span><strong>{videos.length}</strong><small>links diretos</small></div><div className="stat-card"><span className="stat-label">Criativos</span><strong>10</strong><small>meta por produto</small></div></div>
 <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Fotos do produto</h2><p>Clique na foto para abrir em tamanho original; no navegador use Salvar imagem.</p></div><span className="badge badge--green">PRONTO</span></div>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:16}}>{photos.map((p,i)=><div key={p.src} style={{border:'1px solid var(--border)',borderRadius:14,padding:12}}><a href={p.src} target="_blank" rel="noopener noreferrer"><img src={p.src} alt={p.label} style={{width:'100%',height:260,objectFit:'contain',background:'#fff',borderRadius:10}}/></a><h3 style={{margin:'10px 0 8px'}}>{p.label}</h3><a href={p.src} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:9}}>ABRIR / BAIXAR FOTO ↗</a></div>)}</div></section>
 <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Vídeos para referência e material oficial</h2><p>Links reais. Para reutilização, priorize material oficial autorizado pela marca/afiliados.</p></div></div>
 <div style={{display:'grid',gap:10}}>{videos.map((v,i)=><div key={v.url} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,padding:'14px 16px',border:'1px solid var(--border)',borderRadius:12,flexWrap:'wrap'}}><div><b>{i+1}. {v.title}</b><div style={{opacity:.7,fontSize:13,marginTop:3}}>Fonte: {v.source}</div></div><a href={v.url} target="_blank" rel="noopener noreferrer" style={{padding:'10px 14px',border:'1px solid var(--border)',borderRadius:9}}>ABRIR VÍDEO ↗</a></div>)}</div></section>
 <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Ganchos para os 10 criativos</h2><p>Use os vídeos/fotos acima e varie os primeiros 2 segundos.</p></div></div>{hooks.map((h,i)=><div key={h} style={{padding:'10px 12px',margin:'7px 0',border:'1px solid var(--border)',borderRadius:10}}>{i+1}. {h}</div>)}</section>
 <section className="panel" style={{marginTop:18}}><div className="panel-head"><div><h2>Fontes oficiais</h2><p>Para conferir produto, claims e materiais.</p></div></div><p><a href="https://hidrabene.com.br/products/protetor-solar-facial-fps-70-clareador" target="_blank" rel="noopener noreferrer">Hidrabene — página oficial do FPS 70 ↗</a></p><p><a href="https://hidrabene-afiliadaselite.com/" target="_blank" rel="noopener noreferrer">Hidrabene — área Afiliada Elite ↗</a></p></section>
 </div>}

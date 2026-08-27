export type Evidence = {
  source?: string; url?: string; image?: string; title?: string; views?: number; likes?: number; comments?: number;
  reviews?: number; rating?: number; price?: number; salesConfirmed?: boolean; verified?: boolean; ageDays?: number
}

export type CouncilInput = {
  name: string; imageUrl?: string; productUrl?: string; price?: number; cost?: number; currency?: string;
  reviews?: number; rating?: number; salesStatus?: string; sourcesCount?: number; dataQualityPct?: number;
  demandScore?: number; momentumScore?: number; commercialScore?: number; evidences?: Evidence[]
}

const GENERIC = ['pain relief','skin care','beauty product','health product','hair care','device','product','treatment','solution','wellness']
const DIGITAL = ['course','ebook','e-book','webinar','app subscription','digital download','pdf guide','online class']
const CAPSULE = ['capsule','capsules','supplement pills','softgel','softgels','gummies']

function clamp(n:number){return Math.max(0,Math.min(100,Math.round(n)))}
export function resolvePhysicalProduct(p:CouncilInput){
  const name=(p.name||'').trim(); const low=name.toLowerCase()
  const words=name.split(/\s+/).filter(Boolean)
  const generic=words.length<2 || GENERIC.some(x=>low===x)
  const excluded=DIGITAL.some(x=>low.includes(x)) || CAPSULE.some(x=>low.includes(x))
  const validImage=Boolean(p.imageUrl && /^https?:\/\//.test(p.imageUrl))
  const validLink=Boolean(p.productUrl && /^https?:\/\//.test(p.productUrl))
  return {specific:!generic,physical:!excluded,sellable:!generic&&!excluded&&validImage&&validLink,validImage,validLink}
}

export function councilDecision(p:CouncilInput){
  const r=resolvePhysicalProduct(p)
  const ev=p.evidences||[]
  const sourceNames=new Set(ev.map(e=>(e.source||'').toLowerCase()).filter(Boolean))
  const sourceCount=Math.max(Number(p.sourcesCount||0),sourceNames.size)
  const verified=ev.filter(e=>e.verified!==false).length
  const reviews=Math.max(Number(p.reviews||0),...ev.map(e=>Number(e.reviews||0)),0)
  const views=ev.reduce((s,e)=>s+Number(e.views||0),0)
  const engagement=ev.reduce((s,e)=>s+Number(e.likes||0)+Number(e.comments||0),0)
  const demand=clamp(Number(p.demandScore||0) || Math.min(100, Math.log10(reviews+1)*22 + Math.log10(views+1)*8))
  const trend=clamp(Number(p.momentumScore||0) || Math.min(100,Math.log10(engagement+1)*20))
  const competition=clamp(sourceCount>=4?80:sourceCount===3?68:sourceCount===2?55:35)
  const margin=p.price&&p.cost&&p.price>0?clamp(((p.price-p.cost)/p.price)*100):clamp(Number(p.commercialScore||0))
  const quality=clamp(Number(p.dataQualityPct||0) || (sourceCount*15)+(verified*8)+(r.validImage?12:0)+(r.validLink?12:0))
  const evidenceQuality=clamp((sourceCount*16)+(reviews>100?18:reviews>10?10:0)+(views>100000?18:views>10000?10:0)+(r.validImage?10:0)+(r.validLink?10:0))
  const confidence=clamp(quality*.55+evidenceQuality*.45)
  let score=clamp(demand*.25+trend*.15+competition*.10+margin*.15+evidenceQuality*.20+confidence*.15)
  if(!r.sellable) score=Math.min(score,35)
  if(sourceCount<2) score=Math.min(score,69)
  const decision=!r.sellable?'REJEITAR':confidence<45?'REVALIDAR':score>=80&&sourceCount>=3?'APROVAR':score>=60?'OBSERVAR':'REVALIDAR'
  const reasons:string[]=[]
  if(!r.specific) reasons.push('produto genérico')
  if(!r.physical) reasons.push('não é produto físico permitido')
  if(!r.validImage) reasons.push('sem foto válida')
  if(!r.validLink) reasons.push('sem link direto')
  if(sourceCount<2) reasons.push('poucas fontes independentes')
  if(confidence<45) reasons.push('confiança dos dados baixa')
  if(!reasons.length) reasons.push(`${sourceCount} fontes · confiança ${confidence}%`)
  return {score,decision,confidence,sourceCount,demand,trend,competition,margin,evidenceQuality,quality,resolver:r,reasons}
}

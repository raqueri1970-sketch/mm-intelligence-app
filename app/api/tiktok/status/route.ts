import { NextResponse } from 'next/server'

const SUPABASE_URL='https://tazyeczbbgspqbyluynf.supabase.co'
const PUBLISHABLE_KEY='sb_publishable_olCaCIksSYJGOaAYInXHeA_2pm-gaoF'

async function read(path:string,key:string){
 const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:'no-store'})
 if(!r.ok)throw new Error(`Supabase ${r.status}: ${await r.text()}`)
 return r.json()
}
export async function GET(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY||PUBLISHABLE_KEY
 try{
  const [health,signals,guards]=await Promise.all([
   read('mm_source_health?source_name=in.(TikTok,TikTok%20Ads)&order=source_name.asc',key),
   read('mm_source_signals?select=source_name,title,url,score,observed_at&source_name=in.(TikTok,TikTok%20Ads)&order=observed_at.desc&limit=20',key),
   read('mm_free_tier_guard?select=source,month,limit_per_month,used,updated_at&source=in.(tiktok,tiktokAds)&order=source.asc',key),
  ])
  return NextResponse.json({ok:true,health,signals,guards},{headers:{'Cache-Control':'no-store'}})
 }catch(e:any){return NextResponse.json({ok:false,error:e?.message||'tiktok_status_failed'},{status:500})}
}

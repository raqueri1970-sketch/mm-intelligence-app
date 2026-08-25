import { NextRequest, NextResponse } from 'next/server'

const GRAPH = 'https://graph.facebook.com/v23.0'
const SUPABASE_URL = 'https://tazyeczbbgspqbyluynf.supabase.co'

export async function GET(req: NextRequest) {
  const token = process.env.META_ACCESS_TOKEN
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  if (!token) return NextResponse.json({ ok:false, error:'META_ACCESS_TOKEN ausente' }, { status:500 })

  try {
    const accUrl = new URL(`${GRAPH}/me/adaccounts`)
    accUrl.searchParams.set('fields','id,account_id,name,account_status,currency')
    accUrl.searchParams.set('limit','50')
    accUrl.searchParams.set('access_token',token)
    const ar = await fetch(accUrl,{cache:'no-store'})
    const aj = await ar.json()
    if (!ar.ok) throw new Error(aj?.error?.message || 'Falha ao consultar contas')

    const accounts = Array.isArray(aj.data) ? aj.data : []
    const rows:any[] = []
    for (const account of accounts) {
      const u = new URL(`${GRAPH}/${account.id}/ads`)
      u.searchParams.set('fields','id,name,status,effective_status,created_time,updated_time,creative{id,name,thumbnail_url,image_url,object_story_spec}')
      u.searchParams.set('limit','100')
      u.searchParams.set('access_token',token)
      const r = await fetch(u,{cache:'no-store'})
      const j = await r.json()
      if (!r.ok) continue
      for (const ad of (j.data || [])) {
        const c = ad.creative || {}
        const link = c?.object_story_spec?.link_data?.link || c?.object_story_spec?.video_data?.call_to_action?.value?.link || null
        const image = c.image_url || c.thumbnail_url || null
        rows.push({
          ad_key:`meta:${ad.id}`,
          platform:'meta', external_ad_id:String(ad.id), advertiser_name:account.name || null,
          product_name:ad.name || c.name || null, country:'US', language:'en', status_observed:ad.effective_status || ad.status || null,
          first_seen_at:ad.created_time || new Date().toISOString(), last_seen_at:ad.updated_time || new Date().toISOString(), snapshot_at:new Date().toISOString(),
          source_url:`https://www.facebook.com/ads/library/?id=${ad.id}`, landing_page_url:link,
          media:{image_url:image,creative_id:c.id || null}, copy:{creative_name:c.name || null},
          evidence:{source:'Meta Marketing API',account_id:account.account_id,account_name:account.name},
          signals:{account_status:account.account_status,currency:account.currency}, image_identity_validated:Boolean(image)
        })
      }
    }

    let stored = 0
    if (rows.length && sbKey) {
      const sr = await fetch(`${SUPABASE_URL}/rest/v1/mm_ad_snapshots?on_conflict=ad_key`,{
        method:'POST', headers:{apikey:sbKey,Authorization:`Bearer ${sbKey}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}, body:JSON.stringify(rows)
      })
      if (!sr.ok) throw new Error(`Supabase: ${await sr.text()}`)
      stored = rows.length
    }
    return NextResponse.json({ok:true,accounts:accounts.length,ads:rows.length,stored,storage_configured:Boolean(sbKey),sample:rows.slice(0,5)})
  } catch(e:any) { return NextResponse.json({ok:false,error:e?.message || 'collector_failed'},{status:500}) }
}

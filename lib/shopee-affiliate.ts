import { createHash } from 'crypto'

// Cliente da API oficial de Afiliados Shopee Brasil (GraphQL assinado com SHA256).
// Chaves: SHOPEE_APP_ID/SHOPEE_SECRET na Vercel OU, se ausentes, no cofre do Supabase
// (mm_shopee_app_id / mm_shopee_secret), usadas pela edge function mm-shopee-api.
const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'
const SUPABASE_URL = 'https://tazyeczbbgspqbyluynf.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_olCaCIksSYJGOaAYInXHeA_2pm-gaoF'
const BRIDGE = `${SUPABASE_URL}/functions/v1/mm-shopee-api`

export const MISSING_KEYS_MSG =
  'As chaves da Open API da Shopee ainda não foram cadastradas (cofre do Supabase ou variáveis da Vercel).'

export class ShopeeConfigError extends Error {}

const hasEnvKeys = () => Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_SECRET)

async function bridge(body: Record<string, unknown>, cronSecret?: string) {
  const res = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY, ...(cronSecret ? { 'x-mm-cron': cronSecret } : {}) },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

/** true se há chaves na Vercel ou no cofre do Supabase. */
export async function shopeeConfigured() {
  if (hasEnvKeys()) return true
  try { return Boolean((await bridge({ action: 'status' })).json?.configured) } catch { return false }
}

export async function shopeeGraphQL<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown>,
  opts: { cronSecret?: string } = {},
): Promise<T> {
  let json: { data?: unknown; errors?: { message?: string }[]; error?: string }
  if (hasEnvKeys()) {
    const appId = process.env.SHOPEE_APP_ID!, secret = process.env.SHOPEE_SECRET!
    const payload = JSON.stringify({ query, variables })
    const ts = Math.floor(Date.now() / 1000).toString()
    const signature = createHash('sha256').update(appId + ts + payload + secret).digest('hex')
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signature}` },
      body: payload,
      cache: 'no-store',
    })
    json = await res.json()
  } else {
    const { res, json: j } = await bridge({ action: 'graphql', query, variables }, opts.cronSecret)
    if (res.status === 503) throw new ShopeeConfigError(MISSING_KEYS_MSG)
    if (!res.ok && !j?.errors) throw new Error(j?.error || `Ponte Shopee HTTP ${res.status}`)
    json = j
  }
  if (json.errors?.length) throw new Error(`Shopee: ${json.errors[0]?.message || 'erro'}`)
  return json.data as T
}

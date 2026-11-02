import { createHash } from 'crypto'

// Cliente da API oficial de Afiliados Shopee Brasil (GraphQL assinado com SHA256).
// Variáveis: SHOPEE_APP_ID e SHOPEE_SECRET (affiliate.shopee.com.br -> Open API)
const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'

export const MISSING_KEYS_MSG =
  'Configure SHOPEE_APP_ID e SHOPEE_SECRET nas variáveis de ambiente da Vercel (Settings → Environment Variables) e faça redeploy.'

export class ShopeeConfigError extends Error {}

export async function shopeeGraphQL<T = Record<string, unknown>>(query: string, variables: Record<string, unknown>): Promise<T> {
  const appId = process.env.SHOPEE_APP_ID
  const secret = process.env.SHOPEE_SECRET
  if (!appId || !secret) throw new ShopeeConfigError(MISSING_KEYS_MSG)
  const payload = JSON.stringify({ query, variables })
  const ts = Math.floor(Date.now() / 1000).toString()
  const signature = createHash('sha256').update(appId + ts + payload + secret).digest('hex')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signature}`,
    },
    body: payload,
    cache: 'no-store',
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`Shopee: ${json.errors[0]?.message || 'erro'}`)
  return json.data as T
}

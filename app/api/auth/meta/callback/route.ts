import { NextRequest, NextResponse } from 'next/server'

const APP_URL = 'https://mm-intelligence-app.vercel.app'
const GRAPH = 'https://graph.facebook.com/v23.0'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const redirectUri = process.env.META_REDIRECT_URI || `${APP_URL}/api/auth/meta/callback`
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get('mm_meta_oauth_state')?.value
  const error = req.nextUrl.searchParams.get('error')

  if (error) return NextResponse.redirect(`${APP_URL}/meta-ads?error=${encodeURIComponent(error)}`)
  if (!appId || !appSecret) return NextResponse.redirect(`${APP_URL}/meta-ads?error=missing_credentials`)
  if (!code || !state || !savedState || state !== savedState) return NextResponse.redirect(`${APP_URL}/meta-ads?error=invalid_state`)

  try {
    const tokenUrl = new URL(`${GRAPH}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', appId)
    tokenUrl.searchParams.set('client_secret', appSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)
    const tokenRes = await fetch(tokenUrl, { cache: 'no-store' })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson?.error?.message || 'token_exchange_failed')

    const accessToken = String(tokenJson.access_token)
    const accountsUrl = new URL(`${GRAPH}/me/adaccounts`)
    accountsUrl.searchParams.set('fields', 'id,account_id,name,account_status,currency')
    accountsUrl.searchParams.set('access_token', accessToken)
    const accountsRes = await fetch(accountsUrl, { cache: 'no-store' })
    const accountsJson = await accountsRes.json()
    if (!accountsRes.ok) throw new Error(accountsJson?.error?.message || 'adaccounts_validation_failed')

    const accounts = Array.isArray(accountsJson?.data) ? accountsJson.data : []
    const target = new URL('/meta-ads', APP_URL)
    target.searchParams.set('connected', '1')
    target.searchParams.set('accounts', String(accounts.length))
    if (accounts[0]?.name) target.searchParams.set('account_name', String(accounts[0].name))

    const res = NextResponse.redirect(target)
    res.cookies.delete('mm_meta_oauth_state')
    return res
  } catch (e: any) {
    return NextResponse.redirect(`${APP_URL}/meta-ads?error=${encodeURIComponent(e?.message || 'oauth_failed')}`)
  }
}

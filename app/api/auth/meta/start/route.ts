import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const APP_URL = 'https://mm-intelligence-app.vercel.app'

export async function GET(req: NextRequest) {
  const appId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI || `${APP_URL}/api/auth/meta/callback`

  if (!appId) return NextResponse.redirect(new URL('/meta-ads?error=missing_app_id', req.url))

  const state = crypto.randomBytes(24).toString('hex')
  const authUrl = new URL('https://www.facebook.com/v23.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'ads_read,ads_management,business_management')

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('mm_meta_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}

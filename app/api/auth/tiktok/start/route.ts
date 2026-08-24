import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://mm-intelligence-app.vercel.app/api/auth/tiktok/callback'

  if (!clientKey) {
    return NextResponse.redirect(new URL('/tiktok/connect?error=missing_client_key', req.url))
  }

  const state = crypto.randomBytes(24).toString('hex')
  const scope = 'user.info.profile,user.info.stats,video.list'
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
  authUrl.searchParams.set('client_key', clientKey)
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  const res = NextResponse.redirect(authUrl)
  res.cookies.set('mm_tiktok_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return res
}

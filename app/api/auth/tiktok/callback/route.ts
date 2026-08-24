import { NextRequest, NextResponse } from 'next/server'

const APP_URL = 'https://mm-intelligence-app.vercel.app'

export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${APP_URL}/api/auth/tiktok/callback`
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get('mm_tiktok_oauth_state')?.value
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/tiktok/connect?error=${encodeURIComponent(error)}`)
  }
  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(`${APP_URL}/tiktok/connect?error=missing_credentials`)
  }
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/tiktok/connect?error=invalid_state`)
  }

  try {
    const tokenBody = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    })

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
      cache: 'no-store',
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.access_token) {
      const msg = tokenJson?.error_description || tokenJson?.error || 'token_exchange_failed'
      return NextResponse.redirect(`${APP_URL}/tiktok/connect?error=${encodeURIComponent(String(msg))}`)
    }

    const accessToken = tokenJson.access_token as string
    const userFields = [
      'open_id','union_id','avatar_url','display_name','profile_deep_link','bio_description','is_verified',
      'follower_count','following_count','likes_count','video_count'
    ].join(',')

    const userRes = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${encodeURIComponent(userFields)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    const userJson = await userRes.json()
    const user = userJson?.data?.user || {}

    let videoCount = user.video_count ?? ''
    try {
      const videoRes = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,embed_link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ max_count: 10 }),
        cache: 'no-store',
      })
      const videoJson = await videoRes.json()
      if (Array.isArray(videoJson?.data?.videos)) videoCount = videoJson.data.videos.length
    } catch {}

    const target = new URL('/tiktok/connect', APP_URL)
    target.searchParams.set('connected', '1')
    if (user.display_name) target.searchParams.set('name', String(user.display_name))
    if (user.follower_count !== undefined) target.searchParams.set('followers', String(user.follower_count))
    if (user.likes_count !== undefined) target.searchParams.set('likes', String(user.likes_count))
    if (videoCount !== '') target.searchParams.set('videos', String(videoCount))
    if (user.is_verified !== undefined) target.searchParams.set('verified', String(Boolean(user.is_verified)))

    const res = NextResponse.redirect(target)
    res.cookies.delete('mm_tiktok_oauth_state')
    return res
  } catch (e: any) {
    return NextResponse.redirect(`${APP_URL}/tiktok/connect?error=${encodeURIComponent(e?.message || 'oauth_failed')}`)
  }
}

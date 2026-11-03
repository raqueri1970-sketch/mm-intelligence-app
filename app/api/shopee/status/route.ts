import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Diz só se as chaves existem — nunca devolve os valores.
export function GET() {
  return NextResponse.json({ configured: Boolean(process.env.SHOPEE_APP_ID && process.env.SHOPEE_SECRET) })
}

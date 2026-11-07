import { NextResponse } from 'next/server'
import { shopeeConfigured } from '@/lib/shopee-affiliate'

export const dynamic = 'force-dynamic'

// Diz só se as chaves existem (Vercel ou cofre do Supabase) — nunca devolve os valores.
export async function GET() {
  return NextResponse.json({ configured: await shopeeConfigured() })
}

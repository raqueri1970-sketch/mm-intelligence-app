import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tazyeczbbgspqbyluynf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoidGF6eWVjemJiZ3NwcWJ5bHV5bmYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NDU3MDU4MCwiZXhwIjoyMTAwMTQ2NTgwfQ.ui9Sd_6uPuAhnXr1BtcgjzimzhcG1Eittdvm9X9cNe4'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Product = {
  id: number
  name: string
  name_es: string
  niche: string
  source: string
  country: string
  price: number
  status: string
  store_url: string
  image_url: string
  mx_compatible: boolean
  br_compatible: boolean
  score_final: number
  mm_pct: number
  timing: string
  saturation: string
  n_ads: number
  engagement: number
  cpa_ideal: number
  cpa_max: number
  margin_pct: number
  window_mx_days: number
  window_us_days: number
  creative_type: string
  ai_summary: string
  ai_recommendation: string
  ai_hook_en: string
  ai_hook_es: string
  ai_cpa_note: string
  created_at: string
}

export type Alert = {
  id: number
  product_id: number
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

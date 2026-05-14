import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iqrguphnucbcylfhfypn.supabase.co'
const supabaseKey = 'sb_publishable_qtiL0E7Ojy6H-TeoH1uq6w_UBxHVYgE'

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

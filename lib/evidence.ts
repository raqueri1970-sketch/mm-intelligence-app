export type EvidenceProduct = {
  data_quality_pct?: number | null
  sources_count?: number | null
  asset_verified_at?: string | null
}

export function hasVerifiedEvidence(product: EvidenceProduct): boolean {
  return Number(product.data_quality_pct || 0) >= 70
    && Number(product.sources_count || 0) >= 3
    && Boolean(product.asset_verified_at)
}

export function evidenceLabel(product: EvidenceProduct): string {
  if (hasVerifiedEvidence(product)) return 'EVIDÊNCIA VERIFICADA'
  const quality = Number(product.data_quality_pct || 0)
  const sources = Number(product.sources_count || 0)
  return `REVALIDAR · qualidade ${quality}% · ${sources} fonte(s)`
}

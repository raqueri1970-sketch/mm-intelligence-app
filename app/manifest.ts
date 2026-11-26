import type { MetadataRoute } from 'next'

// App instalável (PWA): abre direto no Grupo VIP, com atalhos para Natal, Buscar e Ganhos.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MM Intelligence · Shopee Afiliado',
    short_name: 'MM Shopee',
    description: 'Links de afiliado, fila do Grupo VIP, achados de Natal e comissões da Shopee.',
    lang: 'pt-BR',
    start_url: '/shopee/vip?src=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#060a0f',
    theme_color: '#09111a',
    categories: ['business', 'shopping', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Achados de Natal', short_name: 'Natal', url: '/shopee/natal?src=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Grupo VIP de hoje', short_name: 'Hoje', url: '/shopee/vip?src=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Comissões', short_name: 'Ganhos', url: '/shopee/relatorio?src=app', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}

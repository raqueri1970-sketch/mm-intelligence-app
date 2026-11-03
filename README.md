# MM Intelligence

## Módulo Shopee Afiliado (`/shopee/*`)

| Tela | Rota | O que faz |
|---|---|---|
| Primeiros passos | `/shopee/afiliado` | Checklist do afiliado + status da Open API |
| Minerador | `/shopee/minerador` | Produtos via API de Afiliados (`/api/shopee/products`) |
| Radar de vídeos | `/shopee` | TOP vídeos com link real; botão **Verificar agora** reconfere links e views |
| Criativos | `/shopee/criativos` | Download por link (`/api/video/download`), ganchos e remix no navegador |
| Sub ID | `/shopee/subid` | Um link por vídeo/rede (`/api/shopee/shortlink`) |

Variáveis de ambiente (Vercel): `SHOPEE_APP_ID`, `SHOPEE_SECRET` — obtidas em affiliate.shopee.com.br/open_api após liberação.

Regra do Radar: só entra no ranking vídeo com link que abre e views lidas na própria página. Números de terceiros sem link ficam em "Referências sem link".

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

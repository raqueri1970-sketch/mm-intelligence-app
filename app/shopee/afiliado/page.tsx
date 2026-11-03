'use client'
import Link from 'next/link'
import s from '../shopee.module.css'
import { ApiBadge, KEYS, ShopeeTabs, useApiStatus, useLocal } from '../shared'

const PORTAL = 'https://affiliate.shopee.com.br'

type Step = { id: string; title: string; desc: string; href?: string; cta?: string; internal?: boolean }

const STEPS: Step[] = [
  { id: 'cadastro', title: 'Completar cadastro e dados de pagamento', desc: 'App Shopee → Afiliados → Conta → "Complete suas informações". Sem conta bancária no seu CPF a comissão não é paga.', href: PORTAL, cta: 'PORTAL ↗' },
  { id: 'api', title: 'Pedir liberação da Open API', desc: 'Formulário enviado pela Central de Ajuda (Sim → Outras dificuldades → Cadastro/conta → Quero ativar a API). Resposta em até 3 dias úteis por e-mail.', href: 'https://help.shopee.com.br/portal/10', cta: 'CENTRAL DE AJUDA ↗' },
  { id: 'vercel', title: 'Colar AppID e Senha na Vercel', desc: 'Quando aprovar: vercel.com → mm-intelligence-app → Settings → Environment Variables → SHOPEE_APP_ID e SHOPEE_SECRET → Redeploy. Nunca mande a Senha por chat.', href: `${PORTAL}/open_api`, cta: 'ABRIR API ↗' },
  { id: 'produto', title: 'Escolher o primeiro produto', desc: 'Critério: +1.000 vendas, nota 4,5+, comissão a partir de R$ 3/venda e que dê para demonstrar em vídeo.', href: '/shopee/minerador', cta: 'MINERADOR →', internal: true },
  { id: 'amostra', title: 'Pedir amostra grátis', desc: 'App Shopee → Afiliados → Minhas Amostras. Com o produto na mão você grava vídeo próprio — o que mais converte e não dá ban.' },
  { id: 'criativos', title: 'Gravar e remixar os vídeos', desc: 'Baixe referências, escreva os ganchos e gere 10 versões no Remix.', href: '/shopee/criativos', cta: 'CRIATIVOS →', internal: true },
  { id: 'subid', title: 'Gerar um link com Sub ID por vídeo', desc: 'rede / produto / remix01 / g1 — no Link de Conversão do app ou no Link personalizado do portal.', href: '/shopee/subid', cta: 'SUB ID →', internal: true },
  { id: 'vitrine', title: 'Montar a Vitrine do Afiliado e o Perfil em Shopee Vídeo', desc: 'Coloque o link da Vitrine na bio do TikTok/Instagram e poste os mesmos vídeos no Shopee Vídeo.' },
  { id: 'postar', title: 'Postar todos os dias', desc: 'TikTok + Shopee Vídeo + Reels. 2 a 3 vídeos por dia por produto nas primeiras 2 semanas.' },
  { id: 'relatorio', title: 'Ler o Relatório de vendas toda semana', desc: 'Veja quais Sub IDs venderam, repita o gancho vencedor e corte os que não venderam.', href: PORTAL, cta: 'PORTAL ↗' },
]

const LINKS = [
  { title: 'Oferta de produto', desc: 'Menu Oferta → Oferta de produto: produtos com comissão para escolher o que divulgar.', href: PORTAL },
  { title: 'Link personalizado', desc: 'Menu Oferta → Link personalizado: converte qualquer link da Shopee no seu, com Sub IDs.', href: PORTAL },
  { title: 'Relatório de vendas', desc: 'Menu Relatório → Relatório de vendas: vendas e comissões por Sub ID.', href: PORTAL },
  { title: 'Abrir API', desc: 'Onde aparecem AppID e Senha quando liberar.', href: `${PORTAL}/open_api` },
]

export default function AfiliadoPage() {
  const [done, setDone] = useLocal<Record<string, boolean>>(KEYS.checklist, { cadastro: false, api: true })
  const api = useApiStatus()
  const status: Record<string, boolean> = { ...done, vercel: !!done.vercel || api === 'on' }
  const total = STEPS.filter(st => status[st.id]).length
  const next = STEPS.find(st => !status[st.id])

  return (
    <div className={s.page}>
      <div className={s.head}><h1>Shopee Afiliado — Primeiros passos</h1><p>O caminho do zero até a primeira comissão. Marque cada etapa conforme concluir — fica salvo neste navegador.</p></div>
      <ShopeeTabs />

      <div className={s.stats}>
        <div className={s.stat}><span>Progresso</span><strong>{total}/{STEPS.length}</strong><div className={s.bar}><i style={{ width: `${(total / STEPS.length) * 100}%` }} /></div></div>
        <div className={s.stat}><span>Open API</span><strong style={{ fontSize: 18 }}>{api === 'on' ? 'Ligada ✓' : api === 'off' ? 'Aguardando' : '…'}</strong><small>{api === 'on' ? 'Minerador e links automáticos ativos' : 'formulário enviado — até 3 dias úteis'}</small></div>
        <div className={s.stat}><span>Próximo passo</span><strong style={{ fontSize: 16 }}>{next ? next.title : 'Tudo pronto 🎉'}</strong></div>
      </div>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Checklist</h2><p>Faça na ordem. Os botões levam direto para a tela certa.</p></div><ApiBadge /></div>
        <div className={s.steps}>{STEPS.map((st, i) => {
          const ok = !!status[st.id]
          return (
            <div key={st.id} className={`${s.step} ${ok ? s.stepDone : ''}`}>
              <input type="checkbox" checked={ok} disabled={st.id === 'vercel' && api === 'on'} onChange={e => setDone(d => ({ ...d, [st.id]: e.target.checked }))} aria-label={st.title} />
              <div><b>{i + 1}. {st.title}</b><p>{st.desc}</p></div>
              {st.href && (st.internal
                ? <Link className={`${s.btn} ${s.btnGhost}`} href={st.href}>{st.cta}</Link>
                : <a className={`${s.btn} ${s.btnGhost}`} href={st.href} target="_blank" rel="noopener noreferrer">{st.cta}</a>)}
            </div>
          )
        })}</div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Atalhos do portal de afiliados</h2><p>Abrem em nova aba, já logado na sua conta.</p></div></div>
        <div className={s.cards}>{LINKS.map(l => (
          <a key={l.title} className={s.card} href={l.href} target="_blank" rel="noopener noreferrer"><span>AFFILIATE.SHOPEE ↗</span><br /><b>{l.title}</b><p>{l.desc}</p></a>
        ))}</div>
      </section>
    </div>
  )
}

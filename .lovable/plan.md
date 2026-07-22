## Escopo

Otimização completa de SEO do domínio `agentedesonhos.com.br` sem alterar layout, banco de dados, autenticação, permissões, integrações ou regras de negócio. Todas as rotas privadas e páginas compartilhadas por clientes (orçamentos, roteiros, carteiras, cartões, faturas) receberão `noindex, nofollow` e ficarão fora do sitemap.

---

## Decisão que precisa da sua confirmação

**Nome da marca.** Hoje, todo o projeto usa **"Agentes de Sonhos"** (plural):

- `index.html` → `<title>Agentes de Sonhos</title>`
- `public/manifest.json` → `"name": "Agentes de Sonhos"`
- `src/lib/platform-version.ts` → `PLATFORM_NAME = "Agentes de Sonhos"`
- Domínio institucional: `www.agentesdesonhos.com.br`
- Assets: `logo-agentes-de-sonhos.png`

Seu briefing pede **"Agente de Sonhos"** (singular). Como você mesmo instruiu a não trocar silenciosamente, vou **manter "Agentes de Sonhos"** (plural, identidade atual) em todos os textos, títulos, OG, manifesto e JSON-LD. Se preferir migrar para singular, me diga e eu ajusto tudo em um passo — inclui logo/domínios, então precisa de uma decisão explícita.

Todos os títulos abaixo assumem **"Agentes de Sonhos"**.

---

## 1. Identidade + Head estático (`index.html`)

Reescrever o `<head>` do `index.html` para servir como base sólida antes do React:

- `<title>Agentes de Sonhos | Sistema para Agências de Viagens</title>`
- `<meta name="description">` (versão institucional pedida)
- `<meta name="author" content="Agentes de Sonhos">`
- `<meta name="application-name" content="Agentes de Sonhos">`
- `<meta name="robots" content="index, follow">`
- `<link rel="canonical" href="https://agentedesonhos.com.br/">`
- OG completo (`type`, `site_name`, `title`, `description`, `url`, `locale=pt_BR`, `image`)
- Twitter Cards `summary_large_image`
- Bloco JSON-LD com `@graph` contendo `Organization`, `WebSite` e `SoftwareApplication` (só campos verificáveis; sem rating/preço/depoimento fictício).
- Preservado: GTM, favicons existentes, viewport, apple-touch-icon.

Constante `DEFAULT_OG_IMAGE` centralizada em `src/lib/seo.ts` (nova) para reuso.

---

## 2. Componente central de SEO por rota

Instalar `react-helmet-async` e criar:

- `src/lib/seo.ts` — constantes (`SITE_URL`, `SITE_NAME`, `DEFAULT_OG_IMAGE`).
- `src/components/seo/SEO.tsx` — componente que emite `title`, `description`, `canonical`, `robots`, OG e Twitter por rota, com dedupe.
- `HelmetProvider` em `src/main.tsx`.

Aplicar SEO **institucional público** com `index, follow` e metadados próprios em:

| Rota | Title |
|---|---|
| `/` (LandingPage) | Agentes de Sonhos \| Sistema para Agências de Viagens |
| `/planos` | Planos e Preços \| Agentes de Sonhos |
| `/blog` | Blog \| Agentes de Sonhos |
| `/politicas-privacidade` | Política de Privacidade \| Agentes de Sonhos |
| `/termos-de-uso` | Termos de Uso \| Agentes de Sonhos |
| `/atualizacoes` | Atualizações da Plataforma \| Agentes de Sonhos |
| `/campanha-indicacao` | Indique e Ganhe \| Agentes de Sonhos |
| `/desconto-30-off` | Oferta Especial \| Agentes de Sonhos |

Aplicar SEO **`noindex, nofollow`** (sem expor dados) em todas as rotas privadas e em todas as rotas públicas de conteúdo de cliente. Grupos:

- **Auth/onboarding**: `/auth`, `/reset-password`, `/onboarding`, `/cadastro-link/*`, `/ativar-cartao/*`, `/.lovable/oauth/consent`.
- **Sistema autenticado**: `/dashboard`, `/dashboard-start`, `/admin`, `/admin/crm`, `/ferramentas-ia`, `/gerar-orcamento`, `/criar-roteiro`, `/modelos-roteiros`, `/criar-conteudo`, `/trip-wallet/*`, `/mapa-turismo`, `/cruises`, `/noticias`, `/perfil`, `/minha-conta`, `/assinaturas-comerciais`, `/configuracoes-carteira`, `/materiais`, `/meus-materiais`, `/bloqueios-aereos`, `/calculadora`, `/agenda`, `/bloco-notas`, `/crm`, `/financeiro`, `/gestao-clientes`, `/educa-academy`, `/community`, `/beneficios`, `/mentorias/*`, `/perguntas-respostas`, `/dream-advisor`, `/minha-vitrine`, `/meu-cartao*`, `/criar-cartao`, `/gamificacao`, `/pesquisa`, `/personalizador-laminas`, `/lead-form/*`, `/meus-leads`, `/captacao-leads`, `/sales-landings*`, `/suporte`, `/trade-connect*`, `/agent-profile/*`, `/cursos*`, `/hotel-raio-x`, `/meus-projetos`, `/sorteador`, `/card-capture-quick-access`, `/cadastro-fornecedor`, `/cadastro-guia`, `/guide/*`, `/supplier-profile-edit`, `/requisitos-viagem`, `/dashboard-fornecedor`, `/agenda-trade`, `/supplier/*`, `/operadora/*`, `/cruise/*`, `/certificate-test`.
- **Compartilháveis com cliente (privacidade)**: `/orcamento/*`, `OrcamentoPublicoV2`, `RoteiroPublico*`, `ViagemPublica`, `CarteiraPublica*`, `CartaoPublico`, `VitrinePublica`, `FaturaPublica`, `ShortCodeRedirect`, `SlugResolver`, `PublicCodeResolver`, `SalesLandingPublic`, `OrlandoMagicLandingPage`, `NotFound`.
  - Nesses casos, canonical passa a ser **self-referencial** (não a home) e OG usa imagem institucional + textos genéricos (nada de nome do passageiro, valores, códigos, telefones, e-mails). O componente `setOgMeta` e o edge `public-og` já hoje são conservadores — vou reforçar que nenhum campo sensível vá para OG e forçar `robots=noindex,nofollow` no HTML dessas rotas.

---

## 3. H1 e semântica da home

Auditar `LandingPage.tsx` e garantir **um único H1**: "Sistema completo para agências de viagens" (ou preservar o H1 atual se equivalente — decisão local, sem redesign). Nada além disso muda visualmente.

---

## 4. Favicon, ícones e manifesto

Auditoria dos arquivos em `public/`: `favicon.ico`, `favicon-16x16.png`, `favicon.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `manifest.json`, `wallet-manifest.json`, `og-image.png`.

- Adicionar no `index.html`: `favicon-48x48` (gerado a partir do PNG existente via `sharp`/`convert` se disponível — caso contrário, documentar pendência), `<link rel="manifest">` explícito, `rel="icon" sizes="any"`.
- Renomear `manifest.json` → manter compatibilidade e ajustar campos para conter só a marca atual (já está OK, mas revisar `description`).
- Confirmar que **não há** referência residual a "Lovable" / "GPT Engineer" / "Vite App" em nenhum HTML/asset público (grep).

Não vou substituir os PNGs — os atuais já são da marca. Se algum estiver com identidade errada, informarei no relatório.

---

## 5. `robots.txt` e `sitemap.xml`

**`public/robots.txt`** reescrito para:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /orcamento/
Disallow: /roteiro/
Disallow: /carteira/
Disallow: /cartao/
Disallow: /fatura/
Disallow: /trip-wallet/
...
Sitemap: https://agentedesonhos.com.br/sitemap.xml
```

(Sem bloquear CSS/JS/imagens/fontes.)

**`public/sitemap.xml`** novo, estático, contendo apenas:

- `https://agentedesonhos.com.br/`
- `/planos`
- `/blog`
- `/politicas-privacidade`
- `/termos-de-uso`
- `/atualizacoes`

Documento que é estático (regenera no deploy). Não criar script `generate-sitemap` — sistema não tem hoje e vocês pediram para não fazer alterações arquiteturais desnecessárias.

---

## 6. Canonical e domínio

- Todos os `canonical` e `og:url` apontarão para `https://agentedesonhos.com.br` (não `www.vitrine.tur.br`, não preview).
- OG default global vai apontar para `https://agentedesonhos.com.br/og-image.png` (arquivo já existe em `public/`).
- `src/lib/ogMeta.ts` e `supabase/functions/public-og/index.ts` atualizados para usar `DEFAULT_OG_IMAGE` do novo domínio institucional; mantendo lógica de enriquecimento por tipo (mas sem dados pessoais).

Redirecionamentos HTTP→HTTPS e www→apex são responsabilidade da hospedagem — documentarei no relatório final se for observado desvio.

---

## 7. O que **não** será feito (por design)

- Nada de SSR/SSG/prerender — a stack é Vite SPA, e você pediu para não migrar framework. Metadados por rota via Helmet funcionam para Googlebot; para WhatsApp/Facebook, o edge `public-og` já é o mecanismo existente (não vou trocar).
- Nada de alterar Supabase, RLS, auth, planos, Stripe, banco, integrações, layout do sistema autenticado.
- Nada de alterar assinaturas visuais, cores, hero, componentes de UI.
- Nada de inventar rating, preço, número de clientes ou endereço em JSON-LD.
- Nada de criar páginas institucionais novas (Funcionalidades/Sobre/Contato) — só configuro SEO nas que já existem.

---

## 8. Validação final

- `bun run build` (typecheck + build) sem erros.
- Grep de resíduos: "Lovable", "GPT Engineer", "Vite App", "Lovable Generated Project".
- Grep verificando `noindex` presente em todas as rotas privadas listadas.
- Relatório final com todos os itens exigidos na seção 24 do briefing (arquivos alterados, rotas index/noindex, JSON-LD por rota, URLs no sitemap, robots final, pendências).

---

## Arquivos que serão alterados/criados

**Criados**
- `src/lib/seo.ts`
- `src/components/seo/SEO.tsx`

**Alterados (head estático)**
- `index.html`, `public/robots.txt`, `public/sitemap.xml` (novo), `public/manifest.json` (ajuste description)
- `src/main.tsx` (HelmetProvider)
- `src/lib/ogMeta.ts` (usa constante)

**Alterados (SEO por rota — só `<Helmet>` no topo, sem tocar em lógica)**
- ~60 arquivos em `src/pages/*.tsx` recebem `<SEO … />` no início do JSX.

Nenhum arquivo de hook, edge function de negócio, componente de UI ou de layout do sistema autenticado será modificado.

---

## Pontos que dependem de sua decisão

1. **Confirmar nome da marca**: mantenho "Agentes de Sonhos" (plural, atual) ou migro para "Agente de Sonhos" (singular, briefing)?
2. **OG image**: usar `public/og-image.png` existente ou você fornecerá uma nova arte 1200×630?
3. **Descrição institucional oficial** para JSON-LD `Organization.description`: uso a do briefing ("Plataforma de gestão para agentes de viagens e agências de turismo.") — confirmar.

Se estiver tudo OK, aprovo e sigo com a implementação.

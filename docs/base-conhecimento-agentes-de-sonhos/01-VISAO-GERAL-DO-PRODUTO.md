# 01 — Visão geral do produto

[← Índice](./00-LEIA-ME-E-INDICE.md)

## O que é o Agentes de Sonhos

**CONFIRMADO**. O Agentes de Sonhos é uma plataforma SaaS para agentes e agências de viagens, executada como aplicação web React/Vite com backend Supabase (Lovable Cloud). O produto combina, em uma única assinatura:

- gestão comercial (CRM, oportunidades, operações, metas);
- criação de propostas (orçamentos, roteiros, carteiras digitais públicas);
- gestão financeira (vendas, entradas, despesas, comissões, faturas);
- conteúdo e educação (EducaTravel Academy, cursos e mentorias, notícias);
- comunidade e relacionamento (Trade Connect, perguntas e respostas);
- marketing e captação (vitrine, cartão digital, lâminas, landings, captação conversacional);
- ferramentas de apoio (IA, calculadora, agenda, bloco de notas, requisitos de viagem, Raio-X do Hotel, bloqueios aéreos, mapa do turismo, Travel Advisor).

## Públicos

**CONFIRMADO** pelas rotas e perfis encontrados:

- **Agentes e agências** — usuários principais autenticados.
- **Equipe da agência** — colaboradores criados pelo titular (ver `agency_team_members`).
- **Viajantes/clientes finais** — acessam apenas conteúdo público compartilhado (carteira digital, roteiro, orçamento, fatura, formulários de lead, cartão).
- **Fornecedores** — perfil próprio (`/dashboard-fornecedor`, `/meu-perfil-empresa`) com acesso restrito ao próprio cadastro.
- **Administradores Lovable/Agentes de Sonhos** — área `/admin` e `/admin/crm` para gestão da plataforma.

## Arquitetura em alto nível

**CONFIRMADO**.

- Frontend: React 18 + Vite + Tailwind + shadcn/ui, com TanStack Query e React Router. Páginas carregadas com `lazy()` em `src/App.tsx`.
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions).
- IA: Lovable AI Gateway (Gemini) — chave `LOVABLE_API_KEY` referenciada nas Edge Functions de geração de conteúdo e roteiros.
- Pagamentos: Stripe (`create-checkout`, `create-course-checkout`, `create-public-checkout`, `customer-portal`, `stripe-webhook`, `cancel-subscription`).
- E-mails: Resend (referenciado nas funções de ativação e templates de CRM).
- Integrações externas: Google Calendar, Google Drive, Google Places, Telegram, AviationStack/FlightAware, Travelmeet.

## Domínios e roteamento por hostname

**CONFIRMADO** pelos hostnames cadastrados e por `src/App.tsx`:

- App principal: `app.agentesdesonhos.com.br` e preview Lovable.
- Site institucional: `www.agentesdesonhos.com.br` / `agentesdesonhos.com.br`.
- Subdomínios `*.tur.br` para links públicos e white-label:
  - `carteiradigital.tur.br` — carteira digital pública;
  - `seuorcamento.tur.br` — orçamento público;
  - `seuroteiro.tur.br` — roteiro público;
  - `contato.tur.br` — cartão de visitas público;
  - `vitrine.tur.br` e `lp.vitrine.tur.br` — vitrine de ofertas e landings de vendas;
  - `ativar-cartao.*` — ativação de cartão (tela dedicada montada em `/` e `/auth` quando o hostname combina).

## Princípios de design e UX

**CONFIRMADO** pelo memorial de projeto e padrões aplicados:

- Estética estilo Apple/Nubank, minimalista, com cor primária da agência aplicada via tokens semânticos.
- Layouts de largura total; identidade visual customizada por agência.
- `BrandText` para evitar tradução automática de marcas próprias.
- Sessão de uso interno com timeout de 20 minutos por inatividade.

## Limites e regras transversais

- **CONFIRMADO**: cliente como perfil obrigatório para orçamentos, roteiros e carteiras (ver `ClientSelector`).
- **CONFIRMADO**: RLS estrito por `user_id` na maioria das tabelas; RPCs `SECURITY DEFINER` para acessos elevados; arquivos privados servidos via signed URL ou proxy Edge Function (`get-secure-voucher`, `serve-voucher`).
- **CONFIRMADO**: planos Start, Profissional e Premium com `SubscriptionGuard` e `FeatureGate` controlando acesso a funcionalidades e cotas de IA.
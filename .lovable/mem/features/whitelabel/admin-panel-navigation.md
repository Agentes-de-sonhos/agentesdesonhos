---
name: White-label admin panel navigation
description: Navegação contextual do painel /gestao das agências white label (rotas, atalhos, reservas, 404 com marca)
type: feature
---

Painel administrativo white label vive em `/gestao/*` no domínio da própria agência.

- `src/lib/agencyAdminNav.tsx` centraliza a navegação: `AgencyAdminNavProvider` marca que a app roda sob domínio de agência e `useAdminNav()` devolve caminhos contextuais (`/gestao/criar/orcamento` no white label vs `/ferramentas-ia/gerar-orcamento` na plataforma).
- Páginas reutilizadas (MeusProjetos, GestaoClientes, GerarOrcamento, TripWallet, CriarRoteiro, Financeiro, componentes de CRM como OpportunityCard, ClientProfile, DashboardModule, TemplatesGrid, ReservasTab, ProcessoReserva) devem navegar SEMPRE via `useAdminNav()` — nunca com caminhos absolutos da plataforma, para não sair do domínio da agência.
- Aliases absolutos (`/meus-projetos`, `/gestao-clientes`, `/ferramentas-ia/*`, `/reservas`) continuam registrados no router do painel para links legados; ficam sob o mesmo guard.
- Abas de Meus Projetos sincronizam com `?tab=`; no white label as abas Reservas e Bloco de Notas ficam fora da grade (Reservas tem área própria em `/gestao/reservas`).
- Rotas desconhecidas sob o painel renderizam `AgencyAdminNotFound` com a marca da agência.
- Fora do escopo do painel: Comunidade, Academy, Notícias e Gamificação.

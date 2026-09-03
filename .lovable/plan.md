# Auditoria (somente leitura): Site Lab Base vs. fluxo real white label

Nenhum arquivo foi alterado, nenhuma migração aplicada, nada publicado.

## 1. O que no Site Lab é realmente o mesmo componente real

**Gestão** — apenas a casca visual:
- `AgencyAdminShellView` (`src/components/whitelabel/admin/AgencyAdminShellView.tsx`) — usada pelo painel real via `AgencyAdminLayout.tsx` e pelo demo.
- `AgencyAdminSidebarView` (592 linhas) — usada pelo contêiner real `AgencyAdminSidebar.tsx:100` e pelo demo `SiteLabAdminDemo.tsx:66`.
- `useSidebarCollapsed.ts` e a fonte única de menu `src/lib/agencyAdminMenu.ts` (mesmos itens/ordem/ícones).

**Área do Cliente** — reutilização real e substancial:
- `ClientAreaShell`, `ClientAreaSections` (Home/Documentos/Perfil/Atendimento), `ClientAreaTripsView`/`ClientAreaTripDetail`, `src/lib/clientAreaNav.ts`, `groupTrips`/`highlightTrip` — os mesmos componentes de `src/pages/whitelabel/AgencyClientArea.tsx`.

## 2. O que é imitação, fixture, adaptador ou tela criada do zero

- `src/pages/sitelab/SiteLabAdminSurfaces.tsx` (433 linhas): tabelas, toolbars, KPIs, funil, agenda, reservas, financeiro e “editores” escritos à mão. Nenhum deles é a página real.
- `src/pages/sitelab/sitelabFixtures.ts` (171 linhas): `DEMO_KPIS`, `DEMO_PROJECTS`, `DEMO_KANBAN`, `DEMO_CLIENTS`, `DEMO_BOOKINGS`, `DEMO_FINANCIAL_ROWS`, `DEMO_AGENDA`, `DEMO_REQUESTS` + fixtures da Área do Cliente.
- `src/lib/sitelabAdminNav.ts`: navegação paralela por `?destino=` com `surfaceKindFor()` mapeando o item real para uma das 9 categorias visuais imitadas.
- `src/lib/sitelabModels.ts`: tenant sintético `SITELAB_DEMO_HOSTNAME = "sitelab.local"`, `SITELAB_DEMO_USER_ID` zerado.

## 3. Funcionalidades reais substituídas / omitidas / simplificadas

Todas as páginas reais do painel foram substituídas por superfície estática:

| Menu | Página real (fonte de verdade) | No Site Lab hoje |
| --- | --- | --- |
| Meus Projetos (orçamentos/roteiros/carteiras/modelos) | `src/pages/MeusProjetos.tsx` | tabela fixture `projects` |
| Criar orçamento / carteira / roteiro / modelos | `GerarOrcamento`, `TripWallet`, `CriarRoteiro`, `ModelosRoteiros` | “editor” decorativo |
| Agenda | `src/pages/Agenda.tsx` (+ Google Calendar) | lista fixture |
| Oportunidades / Operações / Clientes | `src/pages/GestaoClientes.tsx` (Kanban, maximize, drag-and-drop, follow-ups) | kanban/cards estáticos |
| Reservas | `src/pages/whitelabel/admin/AgencyReservas.tsx` + `ProcessoReserva` | tabela fixture |
| Financeiro | `src/pages/Financeiro.tsx` | tabela fixture |
| Perfil / Conta / Suporte | `Perfil`, `MinhaConta`, `Suporte` | superfície “account” genérica |
| Home do painel | `src/pages/whitelabel/admin/AgencyAdminHome.tsx` (KPIs reais via RPC) | KPIs fixture |

Também ausentes no laboratório: abas do workspace (`WorkspaceProvider`/`WorkspaceShell`), `AgencyAdminNavProvider`/`useAdminNav`, aliases legados, 404 com marca, `ErrorBoundary` por área, permissões reais (`usePermissions`), sessão de equipe e assinatura.

Na Área do Cliente, o que falta é apenas o miolo de dados: `useClientAreaTrips`/`useClientAreaTrip`/`useClientAreaDocuments`/`useClientAreaProfile` (Edge Function `client-area-auth`), login `ClientAreaLogin`, token por domínio e sincronização de `view`/`tripId` com a URL. A estrutura visual já é a real.

## 4. Fonte de verdade usada hoje por Destinos com a Ju, 100 Limites e Paraíso

- Entrada por domínio: `src/App.tsx` → gate de domínio de agência → `AgencyAdminArea` (`src/components/whitelabel/admin/AgencyAdminArea.tsx`).
- Providers reais: `AuthProvider` → `TeamSessionProvider` → `SubscriptionProvider` → `AgencyAdminNavProvider` (linhas 186-196).
- Guard: `AgencyAdminShell.tsx` — RPC `get_agency_admin_portal` (agência pelo hostname + `admin_portal_enabled`) e `agency_admin_access_check` (vínculo do usuário, revalidado a cada 60s).
- Árvore de rotas: `AgencyAdminPages` (`AgencyAdminArea.tsx:70-108`) — o mapa `/gestao/*` da tabela acima, mais aliases absolutos.
- Layout/menu: `AgencyAdminLayout` + `AgencyAdminSidebar` sobre as Views compartilhadas; menu em `agencyAdminMenu.ts`.
- Área do Cliente: `src/pages/whitelabel/AgencyClientArea.tsx` em `/area-do-cliente`, autenticada por e-mail/senha do passageiro contra a Edge Function `client-area-auth`, com token opaco por domínio.
- Identidade: `get_agency_domain` → `agencyDomains.ts`, `brandTheme.ts` / `useAgencyBrandTheme`, `resolveAgencyLogoUrl`.

## 5. Menor plano correto para o Site Lab usar as páginas reais (sem reconstruí-las)

Ideia central: o laboratório deixa de ter telas próprias e passa a montar **a mesma árvore `AgencyAdminPages`**, sob um tenant de demonstração real (não sintético).

1. Extrair de `AgencyAdminArea.tsx` a árvore de rotas e o conjunto de providers para um componente reutilizável (ex.: `AgencyAdminRoutes` + `AgencyAdminProviders`), sem alterar comportamento do painel real.
2. Criar um tenant de demonstração **real** no banco: um perfil/agência “Site Lab Base” com `user_id` próprio, slug próprio, `admin_portal_enabled = true`, 3 cores e logo do laboratório, e um usuário de autenticação dedicado ao laboratório.
3. `/sitelab-base/gestao` passa a: validar a senha do laboratório (fluxo atual) → garantir sessão do usuário de demonstração → renderizar `AgencyAdminRoutes` com `info` do tenant de demonstração, com base de rota prefixada por `/sitelab-base/gestao`.
4. Área do Cliente: `/sitelab-base/area-do-cliente` renderiza `AgencyClientArea` com o mesmo tenant e um cliente-passageiro de demonstração (viagem a Portugal semeada nas tabelas reais desse tenant).
5. Remover `SiteLabAdminSurfaces.tsx`, `sitelabAdminNav.ts` e as fixtures de gestão; a navegação volta a ser a real (`?tab=`, `/gestao/*`), sem `?destino=`.
6. Semear os dados de demonstração por migração/seed no tenant de demonstração (orçamentos, roteiros, carteiras, clientes, oportunidades, operações, reservas, lançamentos financeiros, eventos de agenda) — não em fixtures de front-end.

Alternativa mais barata, se criar tenant/usuário reais não for aceitável: manter tudo em memória exigiria camada de dados injetável em ~10 páginas grandes — mais custosa e frágil que o tenant de demonstração. Recomendação: tenant real isolado.

## 6. Pré-requisitos de tenant, autenticação, permissões e dados

- **Tenant**: registro de agência de demonstração com domínio/host próprio aceito pelas RPCs (`get_agency_admin_portal`, `get_agency_domain`) — `sitelab.local` não resolve hoje. Precisa também de host allowlist para o laboratório.
- **Autenticação**: sessão real. Duas opções: (a) usuário de demonstração com senha guardada como secret e login feito por Edge Function após validar a senha do laboratório; (b) login manual do usuário de demonstração na tela `/gestao/login`. A opção (a) preserva a experiência atual de senha única.
- **Permissões**: perfil de acesso do usuário de demonstração com as permissões que o menu exige (`opportunities.view`, `operations.view`, `clients.view`, `financial.access`) e plano/assinatura compatível para não cair em `SubscriptionGuard`/`FeatureGate`.
- **Segurança**: como as páginas reais escrevem no banco, o isolamento deixa de ser “nenhuma gravação” e passa a ser “gravação apenas no tenant de demonstração”, garantida por RLS por `user_id`. Adicionalmente: bloquear envios externos (WhatsApp/e-mail/pagamentos) para esse tenant, e reset periódico do seed.
- **Dados**: seed idempotente com viagem a Portugal, clientes fictícios e registros financeiros/reservas coerentes; nenhum dado de Destinos com a Ju, 100 Limites ou Paraíso.

## 7. É tecnicamente possível usar exatamente as páginas reais mudando só identidade e tenant?

Sim, com uma condição: **é preciso uma sessão autenticada e um tenant real**. As páginas reais leem `useAuth`, `usePermissions`, `TeamSessionContext`, `useSubscription` e consultam o banco filtrando por `user_id`; a marca já vem 100% de tokens dinâmicos (`--brand-*`, `resolveAgencyLogoUrl`), então identidade visual é a parte trivial. O que hoje impede a paridade não é o visual — é o tenant sintético com `user_id` zerado e sem sessão. Trocado isso, as mesmas páginas rodam sem reescrita.

## 8. Riscos das mudanças recentes em componentes compartilhados para tenants ativos

- `AgencyAdminSidebarView`/`AgencyAdminShellView` são agora caminho crítico dos três tenants ativos: qualquer ajuste feito “para o laboratório” altera produção. Mitigação: laboratório sem props exclusivas e testes de paridade nas Views.
- `agencyAdminMenu.ts` virou fonte única: mudanças de ordem/permissão afetam simultaneamente os tenants.
- O demo passa props que o painel real não passa (logout falso, `hrefFor` alternativo, usuário fictício), aumentando a superfície de divergência — desaparece ao adotar a árvore real.
- Extrair `AgencyAdminRoutes`/providers de `AgencyAdminArea` toca o ponto de entrada do painel dos três tenants: exige extração puramente mecânica, sem mudança de ordem de providers, e verificação de login/reload/abas em pelo menos um domínio ativo.
- Prefixar rotas por `/sitelab-base/gestao` pode conflitar com aliases absolutos (`/meus-projetos`, `/financeiro`) e com o `AgencyAdminNavProvider`: precisa de base de rota configurável, sem alterar o comportamento atual dos tenants.

## Conclusão

A Área do Cliente já está próxima do real (falta a camada de dados/login). A Gestão é hoje uma via paralela: sidebar e shell reais, todo o conteúdo imitado. Eliminar as telas paralelas é viável e depende de três pré-requisitos, não de reescrita: tenant de demonstração real, sessão autenticada dedicada e seed de dados isolado.

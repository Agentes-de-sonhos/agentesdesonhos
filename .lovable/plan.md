# Dashboard Premium para Fornecedores/Parceiros

## Objetivo
Criar uma experiência completa para usuários com role `fornecedor`, com a mesma sensação visual e estrutural do dashboard do agente — sem versão "simplificada". Hoje o fornecedor é redirecionado direto para `/meu-perfil-empresa` sem dashboard, sidebar ou comunidade.

## Mudanças no roteamento e acesso

- Em `Auth.tsx` e `ProtectedRoute.tsx`: remover o redirect forçado de fornecedor para `/meu-perfil-empresa`. Fornecedor passa a ser redirecionado para `/dashboard-fornecedor`.
- Liberar para a role `fornecedor` o acesso às rotas: `/dashboard-fornecedor`, `/meu-perfil-empresa`, `/materiais` (visualização/upload próprio), `/comunidade`, `/agenda-trade`, `/noticias` (Radar do Turismo), `/educa-academy`, `/mapa-turismo`, `/perfil` (perfil pessoal).
- Bloquear demais áreas internas dos agentes (CRM, Financeiro, Orçamento, Roteiros, etc.) via `ProtectedRoute` com checagem de role.

## Layout e navegação

- Criar `SupplierDashboardLayout` (espelho do `DashboardLayout`) reutilizando `Footer`, `GlobalPopupModal`, `MonthlyPopupModal`, `SessionTimeoutModal`, `ChatFloatingButton` e `ImpersonationBanner`.
- Criar `SupplierSidebar` (mesmo visual do `AppSidebar`) com itens:
  1. Início (Dashboard)
  2. Perfil do Parceiro
  3. Materiais de Divulgação
  4. Comunidade
  5. Agenda do Trade
  6. Radar do Turismo
  7. EducaTravel Academy
  8. Mapa do Turismo
- Criar `SupplierBottomNavBar` para mobile com os 4-5 itens principais.
- `DashboardLayout` existente passa a detectar role e renderizar `SupplierSidebar` quando `isFornecedor`, OU criar layout dedicado (preferência: layout dedicado para isolamento claro).

## Página `/dashboard-fornecedor`

Estrutura espelhando `Dashboard.tsx`:

1. **Header**: saudação dinâmica (Bom dia/tarde/noite + primeiro nome do usuário), frase institucional ("Gerencie sua presença comercial no ecossistema Agente de Sonhos."), `OnlineAgentsStrip`, `ExchangeRateCard`, `NotificationsDropdown`, botões Perfil + Sair. **Sem `GamificationPill`**.

2. **Bloco Perfil do Parceiro (full-width)** — novo componente `SupplierProfileHeroCard`:
   - Logo + nome da empresa + categoria
   - Status de aprovação (badge: pendente/aprovado/rejeitado)
   - Barra de completude do perfil (% calculado por campos preenchidos do `tour_operators`)
   - URL pública: `app.agentesdesonhos.com.br/operadora/{slug}` com botão copiar e abrir
   - Toggle "Perfil público ativado" (nova coluna `is_public_visible` em `tour_operators`)
   - 3 CTAs primários: Editar Perfil Comercial, Visualizar Perfil Público, Inserir Materiais
   - Mini-indicadores premium: visualizações, materiais publicados, agentes alcançados, contatos recebidos (placeholder visual onde ainda não houver dado real).

3. **Linha 2 (2 cols)**: `CuratedNewsFeed` (Radar) + `AcademyCollapsibleCard` (Academy) — reutilizados sem mudança.

4. **Linha 3 (2 cols)**: `CommunityQACard` + `MapaTurismoCard` — reutilizados.

5. **Linha 4 (2 cols)**: novo `SupplierAgendaCard` (próximos eventos do trade publicados pelo fornecedor + status) + novo `SupplierMaterialsCard` (resumo dos materiais publicados, com CTA upload).

6. **Linha 5 (full-width)**: `SupplierMetricsStrip` com 6 indicadores (placeholder onde necessário).

## Agenda do Trade (nova feature)

- Nova tabela `trade_events` com campos: titulo, descricao, data inicio/fim, local, link, tipo (treinamento/roadshow/live/famtour/etc), cover_url, status (pendente/aprovado/recusado), rejection_reason, supplier_user_id, operator_id.
- RLS:
  - Fornecedor: insert/select/update apenas dos próprios eventos.
  - Admin: tudo.
  - Agentes: select apenas eventos com `status = 'aprovado'`.
- Página `/agenda-trade` para fornecedor: lista com filtros por status, botão "Novo evento", form modal de criação/edição, badge de status + motivo da recusa.
- Painel admin: aba nova em `/admin` para aprovar/recusar eventos com motivo.
- Integrar eventos aprovados no `UpcomingAgendaEventsCard` dos agentes (consulta `trade_events` aprovados + agenda existente).

## Materiais de Divulgação para fornecedor

- Reutilizar página `/materiais` em modo "meus materiais": filtrar por `tour_operator_id` do fornecedor.
- Permitir upload (PDF/imagem/vídeo) vinculado ao próprio operador.
- Admin continua moderando se já houver fluxo, ou publicação direta no espaço do fornecedor.

## Comunidade e Perfil Pessoal

- Fornecedor passa a aparecer normalmente em `OnlineAgentsStrip`, chat, posts, Q&A. Habilitar `usePresence` e `useSessionTracker` para a role.
- Bloquear gamificação: em `useGamification`/`GamificationPill`/ranking/medalhas, checar `isFornecedor` e short-circuit (não registrar pontos, não exibir UI).
- Perfil pessoal continua via `/perfil` (componente atual já serve).
- Perfil comercial continua via `/meu-perfil-empresa`.

## Mudanças no banco (migration)

```sql
-- Toggle de visibilidade pública do perfil do parceiro
ALTER TABLE tour_operators
  ADD COLUMN IF NOT EXISTS is_public_visible boolean NOT NULL DEFAULT true;

-- Eventos da Agenda do Trade
CREATE TYPE trade_event_status AS ENUM ('pendente','aprovado','recusado');
CREATE TYPE trade_event_type AS ENUM ('treinamento','evento','roadshow','live','famtour','reuniao','capacitacao','encontro','outro');

CREATE TABLE trade_events (
  id uuid PK default gen_random_uuid(),
  supplier_user_id uuid NOT NULL,
  operator_id uuid REFERENCES tour_operators(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type trade_event_type NOT NULL DEFAULT 'evento',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  link text,
  cover_url text,
  status trade_event_status NOT NULL DEFAULT 'pendente',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at, updated_at timestamptz
);

-- RLS: fornecedor CRUD próprio, admin tudo, agentes SELECT aprovados
-- + trigger updated_at

-- Métricas placeholder: criar tabela supplier_profile_metrics (views, contacts, agents_reached) opcional ou apenas calcular on-the-fly
```

Também atualizar policies de `tour_operators` para respeitar `is_public_visible` em leituras públicas (RPC `get_public_tour_guide` equivalente / leitura pública direta).

## Detalhes técnicos

- Novos arquivos:
  - `src/pages/DashboardFornecedor.tsx`
  - `src/pages/AgendaTrade.tsx`
  - `src/components/layout/SupplierDashboardLayout.tsx`
  - `src/components/layout/SupplierSidebar.tsx`
  - `src/components/layout/SupplierBottomNavBar.tsx`
  - `src/components/supplier-dashboard/SupplierProfileHeroCard.tsx`
  - `src/components/supplier-dashboard/SupplierAgendaCard.tsx`
  - `src/components/supplier-dashboard/SupplierMaterialsCard.tsx`
  - `src/components/supplier-dashboard/SupplierMetricsStrip.tsx`
  - `src/components/admin/AdminTradeEventsManager.tsx`
  - `src/hooks/useTradeEvents.ts`
  - `src/hooks/useSupplierProfileMetrics.ts`
- Mudanças em: `App.tsx` (rotas), `Auth.tsx` (redirect), `ProtectedRoute.tsx` (acesso por role), `useGamification` (bloquear fornecedor), `UpcomingAgendaEventsCard` (incluir trade_events aprovados), `Admin.tsx` (nova aba "Agenda do Trade").
- Reuso direto: `CuratedNewsFeed`, `AcademyCollapsibleCard`, `CommunityQACard`, `MapaTurismoCard`, `OnlineAgentsStrip`, `ExchangeRateCard`, `NotificationsDropdown`, `Footer`, popups, `MediaManager` para materiais.

## Permissões / Segurança

- `ProtectedRoute` com prop `allowedRoles` aplicada nas novas rotas.
- RLS estrita em `trade_events` (split por status para agentes).
- `is_public_visible=false` esconde operador na listagem pública do Mapa do Turismo e bloqueia rota pública individual.
- Sem alteração em rotas internas dos agentes.

## Responsividade

- Grid `lg:grid-cols-2` para desktop, single-column mobile.
- Sidebar colapsável reaproveitando padrão do `AppSidebar`.
- BottomNav só em mobile.

## Entregável final
Fornecedor faz login → cai em `/dashboard-fornecedor` com mesma densidade visual do agente, sidebar premium, blocos de Perfil/Radar/Academy/Comunidade/Agenda/Materiais/Métricas, sem gamificação, com Agenda do Trade integrada à agenda dos agentes após aprovação admin, e toggle de visibilidade pública no perfil comercial.

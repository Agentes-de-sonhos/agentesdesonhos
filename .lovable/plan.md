
# Usuários da Equipe — Plano de Implementação

Recurso para que o dono da agência (usuário principal) crie até 6 colaboradores internos com acesso restrito a **Gestão de Clientes** e/ou **Gestão Financeira**, com permissões granulares por ação e por etapa de funil.

---

## 1. Banco de Dados (Supabase)

### Novas tabelas

**`agency_team_members`** — credenciais e identidade do subusuário
- `agency_id` (uuid) — `user_id` do dono da agência
- `login` (text, unique global) — pode ser e-mail ou identificador
- `password_hash` (text) — bcrypt via Edge Function (`crypto.subtle` / `bcryptjs`)
- `full_name`, `role_title`
- `status` (enum: `active`, `blocked`)
- `last_login_at`, `created_at`, `updated_at`
- Constraint: máx. 6 ativos por `agency_id` (trigger)

**`agency_team_permissions`** — permissões por módulo/ação
- `agency_id`, `team_member_id`
- `module_key` (`clients` | `financial`)
- `permission_key` (ex: `dashboard.view`, `clients.create`, `opportunities.generate_quote`, `operations.edit`, `goals.edit`, `financial.access`)
- `enabled` (boolean)
- UNIQUE(`team_member_id`, `permission_key`)

**`agency_team_stage_permissions`** — controle por etapa de funil dinâmica
- `agency_id`, `team_member_id`
- `pipeline_type` (`opportunities` | `operations`)
- `stage_id` (uuid, FK `pipeline_stages.id` ON DELETE CASCADE)
- `can_view`, `can_edit`, `can_move`

**`agency_team_sessions`** — sessão própria (subusuário não é `auth.users`)
- `team_member_id`, `token_hash`, `expires_at`, `last_seen_at`

### Funções SECURITY DEFINER

- `team_login(p_login, p_password)` → valida bcrypt, devolve token de sessão e snapshot do membro
- `team_validate_session(p_token)` → retorna `team_member_id`, `agency_id`, `status`
- `team_has_permission(p_token, p_permission_key)` → boolean
- `team_can_access_stage(p_token, p_pipeline_type, p_stage_id, p_action)` → boolean
- `team_list_members(p_agency_id)` — usada pelo dono via `auth.uid()`
- `team_create_member(...)`, `team_update_permissions(...)`, `team_set_status(...)`, `team_delete_member(...)` — todas validam `auth.uid() = agency_id` e limite de 6
- Trigger: ao deletar `pipeline_stages`, cascateia `agency_team_stage_permissions`; novas stages nascem sem permissão (nada a fazer — ausência de linha = bloqueado).

### RLS / GRANTs
- Todas as tabelas com RLS. Membros não usam `auth.uid()` (não são auth users) — acesso somente via Edge Functions com `service_role`. Donos acessam via RPC `SECURITY DEFINER` filtrando por `auth.uid() = agency_id`.

---

## 2. Edge Functions

- **`team-login`** — recebe `{login, password}`, chama `team_login`, devolve token JWT-like (random 64 bytes) salvo em `agency_team_sessions`.
- **`team-proxy`** — proxy autenticado para todas as operações de subusuário: recebe token + ação (`list_clients`, `create_opportunity`, `move_stage`, `list_financial`, etc.), valida permissão e executa via `service_role`. Garante isolamento por `agency_id` em **todas** as queries.
- **`team-admin`** — CRUD de membros e permissões (somente dono autenticado).

---

## 3. Frontend

### Sessão dual
- Novo contexto `TeamSessionContext` paralelo ao `AuthContext`.
- `useEffectiveSession()` retorna `{ kind: 'owner' | 'team', userId, agencyId, permissions, stagePermissions }`.
- Persistência: `localStorage` (`team_session_token`), revalidado no boot.

### Login
- Tela `/login` detecta automaticamente: tenta `auth.signInWithPassword` → se falhar, tenta `team-login`. Sem UI extra.

### Botão "Usuários da Equipe"
- Componente `TeamMembersButton` (ícone `Users`) no header de:
  - `src/pages/Clientes.tsx` (Gestão de Clientes)
  - `src/pages/Financeiro.tsx` (Gestão Financeira)
- Visível apenas se `session.kind === 'owner'`.
- Mostra contador "X de 6". Desabilita criação ao atingir limite.

### Tela de gerenciamento (`TeamMembersDialog`)
- Lista: Nome, Login, Cargo, Status (badge), Resumo de permissões, Criado em, Último acesso.
- Ações: Editar | Bloquear/Reativar | Excluir.
- `CreateTeamMemberDialog` / `EditTeamMemberDialog` com formulário:
  - Dados básicos (nome, login, senha + confirmar, cargo)
  - **Gestão de Clientes**: radio `Sem acesso | Total | Personalizado` + checkboxes granulares quando personalizado
  - Lista dinâmica de stages: busca `pipeline_stages` do dono em tempo real (`opportunities` e `operations`)
  - **Gestão Financeira**: switch único

### Sidebar reduzida
- `AppSidebar` consulta `useEffectiveSession()`. Se `team`, renderiza apenas itens autorizados (Clientes / Financeiro). Esconde tudo o mais.
- Mesma lógica em `MobileNav`.

### Dashboard reduzido
- Nova rota `/dashboard-team` (ou redirect dentro de `/dashboard` quando `kind === 'team'`).
- Componente `TeamDashboard`: saudação dinâmica (Bom dia/tarde/noite + nome) + cards grandes para os módulos autorizados.

### Route Guards
- `ProtectedRoute` estendido com prop `requirePermission`.
- `<TeamPermissionGate permission="clients.create">…</TeamPermissionGate>` envolve botões/ações sensíveis.
- Helper `useTeamStageFilter(pipeline)` filtra arrays de stages no Kanban (visualização e drag-and-drop respeitam `can_view` / `can_move`).

### Bloqueios duros (subusuário)
- Não pode abrir Perfil, Configurações, Notificações, Comunidade, Academy, etc. — rotas redirecionam para `/dashboard`.
- Não pode resetar própria senha (UI escondida; backend rejeita).

---

## 4. Mapeamento de permissões

```
clients.* : view, create, edit, delete
opportunities.* : view, create, edit, delete, generate_quote, generate_wallet
operations.* : view, create, edit, delete
goals.* : view, edit
dashboard.view
financial.access
```

Preset "Acesso Total" para Clientes ⇒ marca todas as `clients.*`, `opportunities.*`, `operations.*`, `goals.*`, `dashboard.view` + todas as stages atuais com `can_view/edit/move = true`.

---

## 5. Etapas do funil

- Ao abrir o editor de permissões, fetch ao vivo de `pipeline_stages` (opportunities e operations) do dono.
- Stages exibidas como checkboxes com 3 sub-toggles (Ver/Editar/Mover).
- Ao salvar: `upsert` em `agency_team_stage_permissions` (somente as ativas; resto deletado).
- Novas stages criadas depois ⇒ sem linha ⇒ bloqueadas por padrão (conforme regra).
- Trigger `ON DELETE` em `pipeline_stages` remove permissões órfãs.

---

## 6. Segurança

- **Toda** mutação de subusuário passa por `team-proxy` (service_role). Frontend nunca usa o client Supabase do subusuário para escrever em tabelas de negócio.
- Leituras de subusuário também via `team-proxy` (mesmo que mais lentas) para garantir filtro por `agency_id` + permissão.
- Token de sessão expira em 8h, renovado em cada request.
- Bcrypt cost 10. Login rate-limit 5 tentativas/15min por login.
- Logs de auditoria em `agency_team_audit_log` (login, mudança de permissão, ações sensíveis).

---

## 7. Ordem de entrega

1. Migration: tabelas + RPCs + triggers + GRANTs.
2. Edge Functions: `team-login`, `team-admin`, `team-proxy` (fatiado por domínio).
3. `TeamSessionContext` + integração no `/login`.
4. UI de gerenciamento (botão, dialog, formulários, stages dinâmicas).
5. Sidebar/MobileNav reduzidas + Dashboard reduzido + Route Guards.
6. Permission gates em Clientes, Oportunidades, Operações, Metas, Financeiro.
7. Auditoria de bloqueios em rotas/módulos não autorizados.

---

## Detalhes técnicos

- Hashing: `bcryptjs` na Edge Function (Deno).
- Token: `crypto.randomUUID() + crypto.randomUUID()` armazenado como SHA-256 hash.
- Frontend hook principal: `useTeamPermissions()` retorna `{ has(key), canStage(pipeline, stageId, action), modules }`.
- React Query keys prefixadas com `team:${memberId}` para isolar caches.

# Fase 1 — Usuários da Equipe: acesso real ao CRM e Financeiro

## Arquitetura adotada

Substituir o login "fake" (token customizado em `agency_team_sessions`) por **usuários reais do Supabase Auth**, cada um vinculado à agência do master via uma tabela `agency_membership`. As RLS de CRM/Financeiro passam a aceitar `auth.uid() = owner OR mesma agência do owner`. Sem proxy de Edge Functions para CRUD — queries continuam diretas com React Query e Realtime.

```text
auth.users (master)  ──┐
                       ├──► agency_membership (agency_id, user_id, role)
auth.users (team)    ──┘            │
                                    ▼
                    helper: public.same_agency(uid_a, uid_b) → boolean
                                    │
                                    ▼
                RLS em clients, opportunities, operations, sales,
                expenses, invoices, etc.: owner OR same_agency(owner, auth.uid())
```

## Passos de implementação

### 1. Banco de dados (migração)

- Nova tabela `public.agency_membership(agency_id uuid, user_id uuid PK, role text 'master'|'team', created_at)`. GRANT + RLS (cada user lê apenas suas próprias linhas; service_role gerencia).
- Backfill: para cada `profiles.user_id` existente, inserir `(agency_id = user_id, user_id = user_id, role = 'master')`.
- Adicionar `auth_user_id uuid` em `agency_team_members` (nullable, unique).
- Funções `SECURITY DEFINER`:
  - `public.current_agency_id()` → retorna `agency_id` do `auth.uid()` (do `agency_membership`, cacheável `STABLE`).
  - `public.is_same_agency(_owner uuid)` → `current_agency_id() = (select agency_id from agency_membership where user_id = _owner)`. Stable, evita recursão.
- Atualizar RLS de **todas** as tabelas do CRM e Financeiro (lista no anexo técnico) para:
  ```sql
  USING (user_id = auth.uid() OR public.is_same_agency(user_id))
  WITH CHECK (user_id = auth.uid() OR public.is_same_agency(user_id))
  ```
  As inserções de membros da equipe preservam `user_id = <master_id>` (helper `agency_owner_id()` para defaults no app).
- Trigger em `agency_team_members`: ao criar/ativar, garante linha em `agency_membership(agency_id = master, user_id = auth_user_id, role='team')`. Ao bloquear/excluir, remove a linha.

### 2. Edge Function `team-admin`

- Ao criar membro: também chama `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { agency_id, full_name, is_team_member: true } })`.
- Salva `auth_user_id` em `agency_team_members`.
- Email derivado: usar `login@team.<agency_slug>.local` quando o master não informar email real (permite login via `signInWithPassword` usando o email gerado, mas usuário digita só `login`).
- Ao bloquear: `auth.admin.updateUserById(id, { ban_duration: '876000h' })`. Ao desbloquear: remove ban. Ao excluir: `auth.admin.deleteUser`.
- Limite alinhado em 3 (corrigir hardcode 6).

### 3. Frontend de login

- `Auth.tsx`: continuar com email/senha padrão. Para membros que digitam apenas o "login", resolver email via nova Edge Function leve `team-resolve-login` (retorna o email sintético) e em seguida `supabase.auth.signInWithPassword`. Remove dependência de `team-login`/`team-session`/`agency_team_sessions` para o fluxo de dados.
- `TeamSessionContext`: passa a derivar `member`, `permissions` e `stagePermissions` de uma RPC `team_self()` que lê `agency_team_members + permissions + stage_permissions` a partir de `auth.uid()`. Token customizado fica deprecated (mantido apenas para limpeza).
- `useAuth` agora vale para todos — queries existentes (`enabled: !!user`) destravam automaticamente.

### 4. RLS de CRM e Financeiro

Tabelas afetadas (todas com mesma política `owner OR same_agency`):
- CRM: `clients`, `opportunities`, `operations`, `operation_timeline`, `pipeline_stages`, `operation_pipeline_stages`, `sales_goals`, `client_notes`, `client_history`, `client_categories`, `operation_labels`.
- Financeiro: `sales`, `sale_products`, `expenses`, `invoices`, `invoice_payments`, `customer_payments`, `commissions_receivable`, `tour_operators`, `sellers`, `financial_goals`.

(Lista final validada lendo cada tabela antes de escrever a migração; qualquer tabela do CRM/Financeiro fora desta lista recebe a mesma política.)

### 5. Compatibilidade

- Master continua escrevendo com `user_id = auth.uid()` — inalterado.
- Membros da equipe inserem com `user_id = current_agency_id()` (helper no app: hook `useAgencyOwnerId`). Hooks de criação (clientes, vendas, despesas, etc.) passam a usar esse helper em vez de `user.id` direto.
- Orçamentos, Carteira Digital e Roteiros mantêm RLS atual baseada em `user_id` do master — membros os acessam pelo mesmo helper.

### 6. Limpeza

- `team-login`, `team-session`, `agency_team_sessions` ficam apenas como fallback durante uma janela curta; novos logins usam Supabase Auth. (Remoção total fica para Fase 2.)
- Corrigir mensagem de limite (3) na Edge Function.

## Critérios de aceite verificáveis

1. Master loga e vê seus dados (regressão zero).
2. Membro da equipe loga via `signInWithPassword`, `useAuth().user` populado.
3. Membro vê os mesmos clientes/oportunidades/vendas/despesas do master.
4. Membro cria registros que aparecem para o master.
5. Tentativa de SQL cross-agency retorna 0 linhas (RLS bloqueia).
6. Realtime do CRM/Financeiro continua funcionando para o membro.

## Risco e escopo

Mudança grande: ~1 migração ampla (≥15 tabelas), `team-admin` reescrita, nova função `team-resolve-login`, `TeamSessionContext` simplificado, ajustes em hooks de criação para usar `agency_owner_id`. Espera-se 1 PR único.

## Anexo — arquivos a alterar (estimado)

- `supabase/migrations/<novo>.sql`
- `supabase/functions/team-admin/index.ts`
- `supabase/functions/team-resolve-login/index.ts` (novo)
- `src/contexts/TeamSessionContext.tsx`
- `src/pages/Auth.tsx`
- `src/hooks/useAgencyOwnerId.ts` (novo)
- Hooks de criação de registro em CRM e Financeiro (substituir `user.id` por `agencyOwnerId` no insert)

## Fase 2 (fora deste escopo)

- Aplicar `has(permission)` e `canStage()` em ações reais (gating de criar/editar/mover).
- Rate-limit + política de senha forte.
- Remoção definitiva de `team-login`/`agency_team_sessions`.
- Audit log expandido por ação.

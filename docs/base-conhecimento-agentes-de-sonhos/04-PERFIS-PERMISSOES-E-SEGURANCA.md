# 04 — Perfis, permissões e segurança

[← Índice](./00-LEIA-ME-E-INDICE.md)

## Perfis identificados

**CONFIRMADO** a partir de `useUserRole`, `user_roles`, `AdminRoute`, `TeamRouteGuard`, `SubscriptionGuard` e fluxos de fornecedor:

| Perfil | Origem técnica | Descrição |
|---|---|---|
| Admin | `user_roles.role = 'admin'` | Acesso ao painel `/admin` e `/admin/crm`, impersonação, gestão da plataforma |
| Titular da agência | usuário com `agency_id` próprio em `profiles` | Conta principal, paga assinatura |
| Membro de equipe | `agency_team_members` + sessão via `team-session` | Acesso parcial conforme `agency_team_permissions` |
| Vendedor | `sellers` referenciado em vendas | Pode ter usuário próprio ou ser apenas registro |
| Fornecedor | profile vinculado a `tour_operators`/`tour_guides` | Auto-serviço restrito |
| Usuário público (viajante/lead) | sem autenticação | Acessa apenas páginas públicas com token/slug |

## Matriz de permissões (alto nível)

> Coluna "Aplicado em RLS" indica se a restrição está reforçada no banco (não apenas na UI). **PENDENTE DE CONFIRMAÇÃO** quando não foi possível auditar a política específica nesta passagem.

| Perfil | Módulo | Visualizar | Criar | Editar | Excluir | Aprovar | Compartilhar | Aplicado em RLS | Observações |
|---|---|---|---|---|---|---|---|---|---|
| Admin | Todos | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Pode impersonar (`impersonate-user`) |
| Titular | CRM | Sim | Sim | Sim | Sim | Sim | Sim | Sim (`user_id`) | Dono dos dados |
| Titular | Financeiro | Sim | Sim | Sim | Sim | n/a | Sim | Sim | RLS por `user_id` |
| Titular | Orçamentos/Roteiros/Carteiras | Sim | Sim | Sim | Sim | n/a | Sim | Sim | Links públicos via token |
| Titular | Marketing/Conteúdo | Sim | Sim | Sim | Sim | n/a | Sim | Sim | Vitrine/cartão controlados por `agency_showcases`, `business_cards` |
| Titular | Equipe | Sim | Sim | Sim | Sim | n/a | n/a | Sim | Gerencia `agency_team_*` |
| Membro de equipe | CRM | Sim* | Sim* | Sim* | Sim* | Sim* | Sim* | Parcial | Depende de `agency_team_permissions` |
| Membro de equipe | Financeiro | Sim* | Sim* | Sim* | Sim* | n/a | Sim* | Parcial | Restrito por permissão |
| Membro de equipe | Marketing/Conteúdo | Sim* | Sim* | Sim* | Sim* | n/a | Sim* | Parcial | Restrito por permissão |
| Fornecedor | Próprio cadastro | Sim | n/a | Sim | n/a | n/a | Sim | Sim | Restrito ao próprio operador/guia |
| Fornecedor | Demais módulos | Não | Não | Não | Não | Não | Não | Sim | Bloqueado por `useFeatureAccess`/RLS |
| Viajante público | Carteira/Roteiro/Orçamento/Fatura/Cartão | Sim (com token/senha) | Não | Não | Não | n/a | n/a | Sim | Acesso somente leitura via slug/token |

*depende da configuração granular feita pelo titular.

## Modelo de roles e RLS

**CONFIRMADO**. Roles ficam em `user_roles` com enum `app_role` e função `has_role(uuid, app_role)` `SECURITY DEFINER`. Tabelas do `public` schema têm `GRANT` explícito para `authenticated`/`service_role`, conforme padrão obrigatório do projeto.

- A maioria das tabelas usa RLS por `user_id` (`auth.uid()`).
- Tabelas multi-tenant compartilhadas usam RPCs `SECURITY DEFINER` para acessos elevados.
- Tabelas públicas (mapas, benefícios, materiais admin) liberam `SELECT` para `anon`/`authenticated` quando aplicável.

## Autenticação

**CONFIRMADO**.

- Login por e-mail + senha (sem self sign-up anônimo).
- Reset de senha com listener `PASSWORD_RECOVERY` e página `/reset-password`.
- Sessão de equipe usa fluxo dedicado (`team-login`, `team-resolve-login`, `team-session`).
- Sessão não sincroniza entre `app.agentesdesonhos.com.br` e os subdomínios `*.tur.br` (isolamento intencional).
- Onboarding obrigatório em `/onboarding` após o primeiro login.

## Boas práticas de segurança aplicadas

**CONFIRMADO**.

- Vouchers e documentos privados em buckets restritos, acessados via Edge Function (`serve-voucher`, `get-secure-voucher`).
- Rate limit em endpoints sensíveis (criar cartão, lead wizard, etc.).
- Anti-SSRF e limites de payload (prompt 1000 chars, arquivos 5MB) — ver memória de Anti-Abuse.
- Mensagens de erro em Edge Functions sanitizadas em PT-BR.
- Timeout de sessão 20 min com aviso 30s antes.
- Brute force protection em carteira digital pública (bloqueia após 3 tentativas).
- Logs de impersonação em `impersonation_logs`; ações administrativas em `admin_action_logs`.
- Token curto para captura de cartão em eventos presenciais.

## Limites e responsabilidades

- **PENDENTE DE CONFIRMAÇÃO**: granularidade exata das permissões de equipe por módulo (cada item de `agency_team_permissions`).
- **PENDENTE DE CONFIRMAÇÃO**: regras de exclusão em cascata entre `clients`, `quotes`, `trips`, `sales` (parcialmente documentadas em memórias internas).
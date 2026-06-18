# Módulo: Painel Administrativo

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/admin` e `/admin/crm`.
- **Acesso:** somente perfil **admin** (`user_roles.role = 'admin'`).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Gestão de usuários (criar, deletar, resetar senha, ativar/desativar, listar e-mails, forçar logout).
- Impersonação (`impersonate-user`) com banner persistente.
- Resolução administrativa de recursos (`admin-resolve-resource`).
- Vincular contas de fornecedor (`admin-link-supplier-account`).
- Gestão de menu (drag-and-drop `menu_order`).
- Gestão de banners (`dashboard_banners`, `page_banners`).
- Gestão de popups (`global_popups`, `monthly_phrases`).
- Gestão de Materiais, Notícias, Trilhas, Mentorias, Cursos.
- Sincronização de usuários para CRM admin.
- Logs (`admin_action_logs`, `admin_resource_access_logs`, `impersonation_logs`).

## Evidências
`src/pages/Admin.tsx`, `AdminCRM.tsx`, `src/components/admin/*`, `src/components/auth/AdminRoute.tsx`, Edge Functions `admin-*`.
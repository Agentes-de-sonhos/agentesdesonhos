---
name: Supplier Self-Service Portal
description: Fornecedor role with restricted access to edit own tour_operators profile only
type: feature
---
## Supplier Self-Service Portal

- Role `fornecedor` in app_role enum, stored in user_roles table
- `tour_operators.user_id` links operator to its owner user
- Registration: `/cadastro-fornecedor` (public) → Edge Function `supplier-register` creates user + operator + role atomically
- Profile editing: `/meu-perfil-empresa` — reuses OperadoraDetail visual layout but WITHOUT DashboardLayout, reviews section, or rating display
- Materials section visible but NOT editable — clicking triggers modal with commercial contact email (fernando.nobre@agentesdesonhos.com.br)
- Access restrictions: fornecedor can ONLY access `/meu-perfil-empresa`, no sidebar/menu/dashboard
- RLS: fornecedor can UPDATE only own operator record
- Post-login redirect in Auth.tsx and ProtectedRoute.tsx both handle fornecedor → `/meu-perfil-empresa`

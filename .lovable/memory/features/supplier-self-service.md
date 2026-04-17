---
name: Supplier Self-Service Portal
description: Fornecedor role with restricted access to edit own tour_operators profile only
type: feature
---
## Supplier Self-Service Portal

- Role `fornecedor` in app_role enum, stored in user_roles table
- `tour_operators.user_id` links operator to its owner user
- Registration paths:
  - Public self-signup: `/cadastro-fornecedor` → Edge Function `supplier-register` creates user + new operator + role
  - **Admin-linked account**: in Admin → Mapa do Turismo, key icon (KeyRound) on each operator row opens `CreateSupplierAccountDialog` → Edge Function `admin-link-supplier-account` creates user + role + profile and sets `user_id` on the EXISTING operator. Button is disabled if operator already has user_id.
- Profile editing: `/meu-perfil-empresa` — reuses OperadoraDetail visual layout but WITHOUT DashboardLayout, reviews section, or rating display
- Materials section visible but NOT editable — clicking triggers modal with commercial contact email (fernando.nobre@agentesdesonhos.com.br)
- Access restrictions: fornecedor can ONLY access `/meu-perfil-empresa`, no sidebar/menu/dashboard
- RLS: fornecedor can UPDATE only own operator record
- Post-login redirect in Auth.tsx and ProtectedRoute.tsx both handle fornecedor → `/meu-perfil-empresa`

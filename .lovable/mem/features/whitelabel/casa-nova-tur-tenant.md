---
name: Casa Nova Tur — tenant white label de prospecção
description: Tenant isolado casanovatur.demo.local, perfil casaNovaCurated, tema verde floresta/mint, Edge Function casanova-provision e navegação sem Ofertas
type: feature
---

Tenant NORMAL (não é SiteLab): host técnico `casanovatur.demo.local`, slug
`casa-nova-tur`, `admin_portal_enabled = true`, plano premium. O domínio real
`casanovatur.com.br` NÃO está vinculado. Prévia por `?__agency_host=casanovatur.demo.local`.

- Perfil declarativo `casaNovaCurated` em `agencySiteProfile.ts` (sem ofertas, sem
  equipe/depoimentos/credenciais/DMC; conteúdo apenas factual).
- Tema `casaNovaEditorial` → classe `wl-casanova` (verde floresta #12472B, verde vivo
  #17A34A, mint #E8F5EC — editáveis na Gestão em Perfil).
- Contatos opcionais (e-mail/Instagram) em `agencySiteContacts.ts`, exibidos no rodapé editorial.
- `siteNavLinks(hostname)` em `AgencySiteLayout.tsx` remove `/ofertas` quando o perfil
  desativa a seção — regra declarativa, sem condicional por agência.
- Provisionamento idempotente: Edge Function `casanova-provision`
  (`provision` | `reset_password` | `cleanup`), autorizada por service-role/admin JWT
  ou pelo segredo `CASANOVA_PROVISION_TOKEN`. Senha temporária nunca é persistida.
- Dados fictícios isolados no próprio tenant: 4 clientes, 3 oportunidades, 2 operações.
  Nenhum dado de agência real é lido ou alterado.

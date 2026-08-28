---
name: Identidade visual global das agências
description: Cor principal/secundária da agência centralizadas em brandTheme e aplicadas em painel, site, orçamentos, roteiros, carteira e área do cliente
type: feature
---

Fonte única: `src/lib/brandTheme.ts` (paleta + tokens) e `src/lib/useAgencyBrandTheme.ts`
(aplica as variáveis em `document.documentElement` e `body`, cobrindo portals do Radix).

Dados em `profiles`: `agency_primary_color`, `agency_secondary_color`, `agency_secondary_auto`
(default true). No modo automático a secundária é derivada da principal (mistura com branco).
Expostos por `get_agency_domain` e `get_public_profile`.

Configuração única em `AgencyBrandColorCard` (Perfil): principal + tom claro (switch
"gerar automaticamente"). Ao salvar, invalida `agency-admin-portal`, `agency-domain`,
`agency-admin-profile`.

Tokens: `--brand-primary`, `--brand-secondary`, `--brand-on-primary`, `--brand-primary-hover`,
`--brand-focus-ring`, além de sobrescrever `--primary`, `--accent`, `--ring`, `--sidebar-*`.
Texto sobre a cor principal é calculado por contraste (preto ou branco).

Regra: não usar azuis/laranjas fixos em superfícies de agência — usar os tokens.

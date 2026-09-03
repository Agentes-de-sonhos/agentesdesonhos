---
name: SiteLab Base — consumidor mestre do template white label e paleta de 3 cores
description: Laboratório privado /sitelab-base (site, área do cliente, gestão) que renderiza as páginas reais das agências, tenant técnico isolado e contrato de paleta primária/secundária/terciária
type: feature
---

## Regra definitiva
SiteLab Base NÃO é staging nem demo: é o CONSUMIDOR MESTRE do mesmo template.
Um único código e um único deploy — melhoria no núcleo compartilhado chega ao SiteLab
e a todos os tenants ao mesmo tempo. `SiteLabRoot.tsx` é só compositor fino de
`AgencySiteLayout`/`AgencySiteHome`, `AgencyClientArea` e `AgencyAdminArea`.
Proibido criar cópias/telas paralelas do SiteLab.

## Tenant técnico
`sitelab_templates.admin_hostname` liga o modelo a um tenant técnico isolado
(`sitelab.local` em `agency_public_domains`, user_id `1111...1111`), sem perfil e sem
vínculo com agência real. `agency_admin_access_check` tem regra ADITIVA restrita a esse
tenant: apenas `has_role(uid,'admin')` entra. Identidade (nome/logo/paleta) chega via
prop `identity` de `AgencyAdminArea` (só apresentação). Rotas sob `/sitelab-base` via
`basePath` + `agencyAdminMount`; `/sitelab-base/gestao/*` cobre login e subrotas.

## Contrato de paleta (3 cores)
Fonte única: `src/lib/brandTheme.ts`; conversão central `agencyBrandInput(info)` em
`src/lib/agencyDomains.ts` (inclui `tertiary_color`/`tertiary_auto`).
- primária: marca e ações principais; bordas de intervalo (`--brand-range-edge`);
- secundária: ações secundárias, foco/borda ativa (`--brand-focus-ring`);
- terciária: fundos suaves, seções alternadas, cards selecionados, miolo de intervalos
  e rodapé (`--brand-range-fill`).
Dados: `profiles.agency_primary_color`, `agency_secondary_color/_auto`,
`agency_tertiary_color/_auto`, expostos por `get_agency_domain`, `get_public_profile` e
`get_agency_admin_portal`. Legado só com primária mantém fallback derivado.
Editor: `AgencyBrandColorCard` (Perfil), três cores editáveis a qualquer momento.
SiteLab: #4B2A6E / #FFD600 / #F3EFF7.

## Acesso
Senha validada só no servidor (`verify-sitelab-access`, SHA-256 em `sitelab_templates`),
grant em `sessionStorage` por slug até 8h (`src/lib/sitelabAccess.ts`), bloqueio
progressivo, noindex/nofollow e supressão do modal global de nova versão.

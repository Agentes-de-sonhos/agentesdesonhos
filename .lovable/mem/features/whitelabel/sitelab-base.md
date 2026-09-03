---
name: SiteLab Base e contrato de paleta de 3 cores
description: Laboratório privado /sitelab-base (site, área do cliente, gestão) e contrato de marca primária/secundária/terciária compartilhado por todos os sites de agência
type: feature
---

## Contrato de paleta (3 cores)
Fonte única: `src/lib/brandTheme.ts`.
- primária: marca e ações principais; bordas inicial/final de intervalos de calendário (`--brand-range-edge`);
- secundária: acento real (ações secundárias, foco/borda ativa) → `--brand-focus-ring`;
- terciária: tom muito claro (fundos, superfícies, miolo de intervalos) → `--brand-range-fill`.
Tokens: `--brand-primary`, `--brand-secondary`, `--brand-tertiary`, `--brand-focus-ring`,
`--brand-range-edge`, `--brand-range-fill` (tokens legados continuam compatíveis).

Dados: `profiles.agency_primary_color`, `agency_secondary_color/_auto`,
`agency_tertiary_color/_auto` (expostos por `get_agency_domain` e `get_public_profile`).
Compatibilidade: cadastros antigos guardavam o tom claro na secundária → ela é lida como
terciária e a secundária efetiva acompanha a primária. Não sobrescrever registros antigos.
Editor: `AgencyBrandColorCard` (Perfil) com as três cores; a automação de tom claro pertence
à terciária. Calendário em `src/components/ui/calendar.tsx` consome os tokens de intervalo.

## SiteLab Base
Laboratório independente (não usa dados/identidade da Faé). Modelo em `src/lib/sitelabModels.ts`
(`sitelab-base`, paleta #4B2A6E / #FFD600 / #F3EFF7), fixtures em `src/pages/sitelab/sitelabFixtures.ts`,
telas em `SiteLabRoot.tsx` / `SiteLabClientAreaDemo.tsx` / `SiteLabAdminDemo.tsx`.
Rotas (antes dos catch-alls do `App.tsx`): `/sitelab-base`, `/sitelab-base/area-do-cliente`,
`/sitelab-base/gestao` — noindex/nofollow e badge "Ambiente de demonstração".
Acesso: senha validada só no servidor (`verify-sitelab-access`, SHA-256 em `sitelab_templates`,
sem SELECT para authenticated; config pública via RPC `get_sitelab_template`), grant em
`sessionStorage` por slug válido para as três áreas por até 8h (`src/lib/sitelabAccess.ts`),
bloqueio progressivo e mensagens genéricas.
Novos modelos: inserir em `sitelab_templates` com slug, nome, logo, 3 cores e `custom_overrides`.

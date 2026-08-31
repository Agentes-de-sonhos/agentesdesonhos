---
name: Destinos com a Ju (White Label)
description: Tenant destinoscomaju.com.br em modo página em construção (variante exclusiva), com home completa acessível via /preview
type: feature
---
- Hostnames `destinoscomaju.com.br` / `www.` estão em `under_construction` com `variant: "destinosComAJu"` em `agencySiteStatus.ts` → home `/` renderiza `DestinosComAJuComingSoon`.
- A rota `/preview` (gate por senha) permanece intacta e dá acesso ao site completo para revisão.
- Site completo (quando liberado): estrutura idêntica à 100 Limites, perfil `editorialRose` em `agencySiteProfile.ts`, tema `roseEditorial` (`wl-editorial wl-rose`). Nunca tocar tokens de `wl-editorial` (100 Limites) ou `wl-luxury` (Paraíso).
- Logo oficial por hostname em `src/lib/agencySiteBrand.ts` (`resolveAgencyLogoUrl`).

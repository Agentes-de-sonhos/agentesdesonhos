---
name: Destinos com a Ju (White Label)
description: Tenant destinoscomaju.com.br usa o template editorial da 100 Limites com tema rosé exclusivo e logo oficial via asset
type: feature
---
- Hostnames `destinoscomaju.com.br` / `www.` NÃO usam mais a página temporária (removidos de `agencySiteStatus`); renderizam a home White Label completa.
- Estrutura/seções idênticas à 100 Limites: perfil `editorialRose` em `agencySiteProfile.ts` (sem overrides). Conteúdo exclusivo DMC nunca é herdado (resolvido por hostname).
- Tema `roseEditorial` (`agencySiteTheme.ts`) → classe raiz `wl-editorial wl-rose`; tokens rosé/magenta + bordô em `src/index.css`. Nunca tocar tokens de `wl-editorial` (100 Limites) ou `wl-luxury` (Paraíso).
- Logo oficial por hostname em `src/lib/agencySiteBrand.ts` (`resolveAgencyLogoUrl`), asset `logo-destinos-com-a-ju-atualizado.png.asset.json`; demais tenants seguem `info.logo_url`.

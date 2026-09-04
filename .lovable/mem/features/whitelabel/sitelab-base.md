---
name: SiteLab Base — consumidor mestre do template white label e paleta de 3 cores
description: Laboratório privado /sitelab-base (site, área do cliente, gestão bloqueada por isolamento) e contrato de paleta primária/secundária/terciária
type: feature
---

## Regra definitiva
SiteLab Base NÃO é staging nem demo: é o CONSUMIDOR MESTRE do mesmo template.
Um único código e um único deploy. `SiteLabRoot.tsx` é só compositor fino de
`AgencySiteLayout`/`AgencySiteHome` e `AgencyClientArea`. Proibido criar cópias
ou telas paralelas.

## Isolamento (regra crítica)
As páginas compartilhadas resolvem o contexto por `auth.uid()`. Por isso o
laboratório tem CONTA TÉCNICA EXCLUSIVA provisionada
(`sitelab.base@agentesdesonhos.com.br`, plano premium, profile próprio,
`agency_membership` master de si mesma) ligada ao tenant `sitelab.local`
(`agency_public_domains.admin_portal_enabled = true`, ligado por
`sitelab_templates.admin_hostname`). `/sitelab-base/gestao` monta o painel real
`AgencyAdminArea` com `basePath=/sitelab-base`.
- `agency_admin_access_check` permanece EXATAMENTE na lógica original (dono do
  domínio ou `agency_membership`) — administradores da plataforma NÃO têm
  exceção: se um admin logado abrir a gestão do laboratório, o guard recusa e
  encerra a sessão;
- identidade visual nunca é usada para mascarar escopo de dados;
- provisionamento idempotente pela Edge Function `sitelab-provision` (só admin);
  a senha da conta técnica é aleatória — defina-a pelo fluxo administrativo de
  redefinição de senha.


## Montagem da Gestão (regra crítica)
`/sitelab-base/gestao/*` é decidido em `App.tsx` ANTES de qualquer router
(`isSiteLabAdminPath` → `SiteLabAdminEntry`), igual ao que `AgencyDomainRoutes`
faz nos domínios próprios: o painel real usa o workspace de abas (um router por
aba) e Router dentro de Router quebra em produção sem mensagem. Site e Área do
Cliente seguem dentro do router do App via `SiteLabRoot`; a chrome (senha, barra
superior, paleta) é compartilhada em `SiteLabChrome.tsx`.

## Contrato de paleta (3 cores)
Fonte única `src/lib/brandTheme.ts` + conversor `agencyBrandInput(info)` em
`src/lib/agencyDomains.ts` (inclui `tertiary_color`/`tertiary_auto`).
- primária: marca/ações principais e bordas de intervalo (`--brand-range-edge`);
- secundária: ações secundárias, foco/borda ativa (`--brand-focus-ring`);
- terciária: fundos suaves, seções alternadas, cards selecionados, miolo de
  intervalos e rodapé (`--brand-range-fill`).
Dados em `profiles.agency_*_color/_auto`, expostos por `get_agency_domain`,
`get_public_profile` e `get_agency_admin_portal`. Legado só com primária mantém
fallback derivado. Editor: `AgencyBrandColorCard` (Perfil), três cores livres.
SiteLab: #4B2A6E / #FFD600 / #F3EFF7.

## Acesso
Senha validada no servidor (`verify-sitelab-access`), grant em `sessionStorage`
por slug até 8h, bloqueio progressivo, noindex/nofollow, modal global de nova
versão suprimido.

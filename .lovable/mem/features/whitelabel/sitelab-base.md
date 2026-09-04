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
As páginas compartilhadas resolvem o contexto de dados por `auth.uid()`
(`useAgencyOwnerId` faz fallback para o próprio usuário; `TeamSessionProvider`
idem). Logo, montar `AgencyAdminArea` no laboratório faria o painel ler/gravar
dados da conta administrativa logada. Por isso:
- `/sitelab-base/gestao` renderiza estado seguro `SiteLabAdminUnavailable`
  (sem providers, sem sessão, sem consultas);
- `agency_admin_access_check` permanece EXATAMENTE na lógica original
  (dono do domínio ou `agency_membership`) — sem exceção para admins;
- o tenant técnico `sitelab.local` (user_id `1111...1111`, ligado por
  `sitelab_templates.admin_hostname`) fica com `admin_portal_enabled = false`;
- identidade visual nunca é usada para mascarar escopo de dados.
Ativar CRUD real exige provisionar UMA conta técnica de autenticação exclusiva
do laboratório (com profile e membership próprios) e reabilitar o painel.

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

---
name: White-label Agency Site Home
description: Home do site white label da agência (100limites.tur.br) — hero/carrossel, Central de Solicitações de 8 serviços e integração segura com o CRM
type: feature
---
# Site white label da agência — Home

## Estrutura
- Rotas em `AgencyDomainRoutes` (hostname → agência via `get_agency_domain`): `/`, `/ofertas`, `/area-do-cliente`, `/orcamento|roteiro|carteira|fatura/:codigo`, privacidade e termos.
- Home: `src/pages/whitelabel/AgencySiteHome.tsx` — hero/carrossel (1–5 banners, respeita `prefers-reduced-motion`) + card branco da **Central de Solicitações** avançando sobre o banner.
- Seções, módulos temáticos, destaques, diferenciais e FAQ centralizados em `src/lib/agencySiteConfig.ts` (`resolveSections`/`resolveModules` permitem ativar/ocultar/ordenar por agência). Nada hardcoded nas seções.
- "Ofertas em destaque" só aparece se existir `agency_showcases` ativa para o slug da agência; `/ofertas` continua existindo.

## Central de Solicitações
- `src/components/whitelabel/AgencyRequestCenter.tsx`: 8 abas (aéreo, hospedagem, carro, transfer, ingressos, seguro, cruzeiros, pacotes), formulário em 2 etapas (dados da viagem → contato) com resumo antes do envio.
- Schemas declarativos + validação em `src/lib/agencySiteRequests.ts`. Exige nome, consentimento e **WhatsApp OU e-mail**. Valores preservados por serviço ao trocar aba/etapa.

## Integração CRM (segura)
- Envio via Edge Function `submit-agency-site-request` (rate limit por IP, honeypot, tempo mínimo 3s, idempotência) → RPC `submit_agency_site_request(p_hostname, p_payload)` (apenas `service_role`).
- O tenant vem SEMPRE do hostname no servidor; o browser nunca escolhe `agency_id`/`user_id` nem grava em `clients`/`opportunities`.
- Persistência em `agency_site_requests`; cliente/oportunidade criados por `ensure_client_and_opportunity_for_lead` (dedupe por telefone normalizado, oportunidade na primeira coluna do funil).
- Limitação atual: não há e-mail automático de notificação para este canal (as tabelas de notificação existentes são vinculadas a `form_id`/landing).

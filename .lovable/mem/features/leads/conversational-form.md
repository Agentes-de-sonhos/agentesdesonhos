---
name: Conversational Lead Form
description: Formulário Conversacional de captação — submissão server-side, configuração da agência, horários, consentimento LGPD e notificações por e-mail
type: feature
---
# Formulário Conversacional (Captação de Leads)

## Segurança
- Visitantes NÃO gravam em `lead_captures` (política anon de INSERT removida) e não leem `lead_capture_forms`.
- Leitura pública: RPC `get_public_lead_form(token)`. Métrica: `track_lead_form_view(token, session_hash)`.
- Gravação: Edge Function `submit-lead-form` (rate limit por IP, honeypot, tempo mínimo de 3s) → RPC `submit_conversational_lead` (apenas `service_role`).
- Dedupe: `idempotency_key` único + bloqueio do mesmo telefone no mesmo formulário por 10 minutos.
- Consentimento obrigatório (`consent_at`, `consent_version`), com links opcionais de privacidade/termos.

## Configuração da agência (`lead_capture_forms`)
Identidade (headline, nome, logo, consultor, foto, WhatsApp, cor), mensagens de boas-vindas/encerramento, perguntas opcionais (`ask_email`/`require_email`/`ask_dates`/`ask_travelers`/`ask_budget`), `ai_enabled`, `timezone` + `office_hours`, `test_mode_until`, `views_count`/`leads_count`.
Painel: `/meus-leads/conversacional` (`src/pages/MeusLeads.tsx`) com abas Compartilhar (link + QR + modo de teste), Aparência, Perguntas, Horários e Notificações.

## Regras
- Horário de atendimento é decidido pelo servidor (`server_now` + `useServerClock`, `is_within_office_hours_json` no banco). Nunca pelo relógio do visitante.
- Dentro do horário: CTA de WhatsApp no final. Fora: aviso de retorno no próximo horário.
- Modo de teste (`test_mode_until`) libera o link em rascunho por 2h; envios de teste não contam métricas nem criam cliente/oportunidade.
- IA (`lead-wizard-ai`) é opcional e nunca bloqueia o lead: há resumo determinístico em `buildLeadSummary`.
- CRM: cliente + oportunidade criados dentro do RPC (o trigger `trg_lead_capture_to_opp` foi removido para evitar duplicidade).
- Notificações: `lead_form_notification_settings` / `_recipients` / `lead_form_lead_deliveries`, drenadas pelo mesmo cron de `product-landing-lead-emails` (um e-mail por destinatário).

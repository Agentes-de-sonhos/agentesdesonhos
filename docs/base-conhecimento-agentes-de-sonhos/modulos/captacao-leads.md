# Módulo: Captação de Leads

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/meus-leads` (hub), `/meus-leads/conversacional` (wizard IA), `/meus-leads/landings` (landings), `/formulario/:token` (formulário público).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Formulários públicos (`lead_capture_forms` + `lead_captures`).
- Wizard conversacional com IA (`lead-wizard-ai`), bloqueia duplicatas.
- Sales Landings (`sales_landings`, `sales_landing_leads`, `sales_landing_views`).
- OCR de cartões de visita (`/captura-cartao/:token`, Edge `extract-business-card`).
- Alertas em tempo real de novos leads (`NewLeadAlertProvider`).

## Regras
- Tokens em URL controlam acesso aos formulários.
- Rate limit em endpoints de IA.

## Evidências
`src/pages/CaptacaoLeads.tsx`, `MeusLeads.tsx`, `SalesLandings*.tsx`, `LeadFormPublic.tsx`, `CardCaptureQuickAccess.tsx`, `src/components/leads/*`, tabelas `lead_capture_forms`, `lead_captures`, `sales_landings`, `sales_landing_*`, `crm_card_captures`.
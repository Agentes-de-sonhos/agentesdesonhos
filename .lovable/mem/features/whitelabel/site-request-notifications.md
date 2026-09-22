---
name: Solicitações do site → CRM: reset, notificações e aviso em tempo real
description: Regras do formulário público (baseline de campos, envio único, reset total), fila de e-mails idempotente, WhatsApp preparado sem template e aviso realtime com link direto da oportunidade
type: feature
---

- Campos do assistente (`stepFields`/`occurrencePlan`) são decididos pelo
  RETRATO INICIAL (`baseline`), nunca pelos valores digitados: por isso o campo
  de ingressos deixou de desaparecer no primeiro caractere.
- Envio único: `submittingRef` bloqueia duplo toque; `completedRef` impede que o
  rascunho volte a ser gravado após concluir. Fechar a confirmação (botão, X ou
  fundo) chama `handleSuccessClose` → reset total + `onCompleted` (volta à home).
  Nada do cliente anterior sobrevive para o próximo.
- Teclado mobile: `useKeyboardInset` encolhe o modal, `useRevealFocusedField`
  revela o campo focado e `focusNextField` faz o Enter avançar sem enviar.
- Notificações em `agency_request_notifications` (migration 0023), canais
  `email_client`, `email_agency`, `whatsapp_agency`, com
  `UNIQUE(request_id, channel)`: reprocessar nunca duplica aviso nem cria
  segunda oportunidade. Worker: `product-landing-lead-emails`.
- WhatsApp fica PREPARADO e INERTE (`awaiting_template`) até existir template
  aprovado + `WHATSAPP_REQUEST_TEMPLATE_SID`/`WHATSAPP_FROM`. Ver
  `docs/whatsapp-solicitacoes-site.md`.
- Aviso interno: `useAgencySiteRequestAlerts` assina `agency_site_requests`
  filtrando `agency_user_id` (isolamento + RLS), com dedupe por id. Popup
  `NewSiteRequestAlert` ("Nova solicitação recebida pelo site") abre
  `/crm?opportunity=<id>`; o funil consome o parâmetro e o remove só depois.

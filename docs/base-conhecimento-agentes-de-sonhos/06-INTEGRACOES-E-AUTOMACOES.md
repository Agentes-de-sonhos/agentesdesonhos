# 06 — Integrações e automações

[← Índice](./00-LEIA-ME-E-INDICE.md)

## Integrações externas

> Apenas nomes técnicos e variáveis de ambiente são citados. Nenhum valor é exposto.

| Integração | Variáveis/serviço | Finalidade | Onde é usada | Estado |
|---|---|---|---|---|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout, portal do cliente, assinaturas, cursos | `create-checkout`, `create-course-checkout`, `create-public-checkout`, `customer-portal`, `cancel-subscription`, `check-subscription`, `stripe-webhook` | CONFIRMADO |
| Lovable AI Gateway (Gemini) | `LOVABLE_API_KEY` | Geração de conteúdo, roteiros, captação conversacional, OCR de cartão, Raio-X do Hotel, curadoria de notícias | `generate-*`, `parse-itinerary-ai`, `refine-itinerary-activity`, `lead-wizard-ai`, `extract-business-card`, `hotel-rx`, `curate-news`, `ai-import-service` | CONFIRMADO |
| Resend | `RESEND_API_KEY` | E-mails transacionais (ativação, CRM) | `send-crm-email`, `activate-card-signup` (e similares) | CONFIRMADO |
| Google Places | `GOOGLE_PLACES_API_KEY` (ou similar) | Autocomplete, fotos de hotel/atividade, Raio-X | `places-autocomplete`, `hotel-autocomplete`, `hotel-photos`, `activity-photo`, `hotel-rx`, `generate-destination-intro` | CONFIRMADO |
| Google Calendar | OAuth | Sincronização bidirecional da agenda | `google-calendar-auth`, `google-calendar-callback`, `google-calendar-sync` | CONFIRMADO |
| Google Drive | OAuth | Importação de materiais | `google-drive-auth`, `google-drive-callback`, `drive-import-materials`, `cleanup-materials` | CONFIRMADO |
| FlightAware (AeroAPI) / AviationStack | `FLIGHTAWARE_API_KEY`, `AVIATIONSTACK_API_KEY` | Status e dados de voos | `flight-lookup`, `flight-status`, `flight-status-monitor` | CONFIRMADO |
| Telegram | `TELEGRAM_BOT_TOKEN` | Bot para canais de fornecedor | `telegram-setup`, `telegram-webhook` | CONFIRMADO |
| Travelmeet | API externa | Sincronização de operadoras/fornecedores | `travelmeet-admin` + memória dedicada | CONFIRMADO |
| Open Graph público | — | Geração de previews neutros para links públicos | `public-og`, `quote-og`, `card-og-image` | CONFIRMADO |

## Automações internas relevantes

| Automação | Trigger | Efeito | Estado |
|---|---|---|---|
| Sincronização `profiles` → CRM admin | Trigger `trg_sync_profile_to_crm` | Upsert em `crm_contacts` quando profile muda | CONFIRMADO (memória) |
| Comissão de vendedor → despesa | Update em venda com vendedor | Cria/atualiza despesa `comissao` automaticamente | CONFIRMADO (memória) |
| Cálculo de data de recebimento | Trigger em vendas/parcelas | Calcula vencimento conforme termos | CONFIRMADO (memória) |
| Sincronização `sale_amount` | Trigger em produtos de venda | Atualiza total da venda | CONFIRMADO (memória) |
| Atualização de `user_presence` | Heartbeat via `useSessionTracker` | KPI de uso no admin | CONFIRMADO |
| Bloqueio da carteira pública | Após 3 tentativas de senha | Bloqueia acesso temporariamente | CONFIRMADO (memória) |
| Popup mensal | Hook `useMonthlyPopup` + `monthly_popup_views` | Exibe uma vez por mês | CONFIRMADO |
| Feedback mensal obrigatório | `feedback_settings` + modal | Bloqueia uso até resposta | CONFIRMADO |
| Auto-downgrade para plano Start | Webhook Stripe `cancel`/`payment_failed` | Rebaixa o usuário | CONFIRMADO (memória) |
| Provisionamento de assinatura | `stripe-webhook` | Mapeia preço para plano e dispara e-mail Resend | CONFIRMADO (memória) |
| Sorteios e prêmios mensais | `raffles`, `promoter_monthly_winners` | Programa de promotores | CONFIRMADO |
| Notificações de lead em tempo real | `NewLeadAlertProvider` | Alertas in-app | CONFIRMADO |
| Importação de documentos por IA | `import-hotel-document`, `import-airfare-document`, etc. | Cria serviços a partir de PDFs/imagens | CONFIRMADO |
| Limpeza programada de materiais | `cleanup-materials` | Remove arquivos do Drive removidos | CONFIRMADO |

## Webhooks

- `stripe-webhook` — entrada de eventos de pagamento e assinatura.
- `telegram-webhook` — entrada de mensagens do bot.
- **PENDENTE DE CONFIRMAÇÃO**: existência de cron jobs adicionais (não foi possível listar `cron.job` nesta auditoria).

## Tratamento de erros

- Todas as Edge Functions retornam mensagens sanitizadas em PT-BR.
- Buckets sensíveis nunca expõem URLs públicas — usam signed URL ou proxy.
- Rate limits estão presentes em `create-business-card` (5 req/min), `lead-wizard-ai`, importadores de IA.
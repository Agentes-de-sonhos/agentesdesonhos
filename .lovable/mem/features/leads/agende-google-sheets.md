---
name: Agende → Google Sheets
description: Espelhamento dos leads da página /agende na planilha "Leads | Agendamento - EducaTravel Academy" via connector gateway
type: feature
---
# /agende → Google Sheets

- Cadastro continua indo para a Edge Function externa `agende-public-api` (projeto EducaTravel). Nada nesse fluxo foi alterado.
- Após sucesso, `sendAgendeLeadToSheet` (em `src/lib/agendePublic.ts`) chama a Edge Function local `agende-lead-to-sheet` (best-effort, nunca bloqueia a UI).
- A função usa o connector gateway do Google Sheets (`LOVABLE_API_KEY` + `GOOGLE_SHEETS_API_KEY`), planilha `1eDkNw5Vi9MMQxNR2EKcgZuvMApnYyrLMFQgpHut6M6k`, aba `Página1`, `values:append`.
- Colunas: email, nome, sobrenome, whatsapp, whatsapp_opt_in, agencia, estado, cidade, sessao, utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at (America/Sao_Paulo).
- UTMs vêm de `resolveTracking` (sessionStorage `agende:tracking`). Dedupe por `email|sessao` em sessionStorage `agende:sheet-sent`.

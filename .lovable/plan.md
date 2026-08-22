# Auditoria (somente leitura) — Notificações do pedido de reserva pelo orçamento público

HEAD auditado: `01dbbf2e`. Nenhum código, banco, função, template ou configuração foi alterado.

## 1. Onde o pedido é criado e onde as notificações disparam

- Criação: RPC `public.submit_quote_booking_request` (SECURITY DEFINER), definição em `supabase/migrations/20260821190426_...sql`. Insere em `quote_booking_requests`, depois `quote_booking_request_items` (a partir de `quote_services` + `quote_service_choice_groups`), calcula total no banco, grava evento `request_received`, sincroniza CRM (`sync_booking_request_opportunity` ou `ensure_client_and_opportunity_for_lead`) e enfileira as linhas de aviso em `quote_booking_request_deliveries`.
- Endpoint público: `supabase/functions/submit-booking-request/index.ts` — valida payload (`validate.ts`), rate limit 8/60s por IP, hash de IP, chama a RPC com service role. O navegador nunca escreve na tabela.
- Disparo do e-mail: `supabase/functions/submit-booking-request/notify.ts` → `deliverBookingNotifications(supabase, request_id)`, chamado em `index.ts` apenas quando `result.duplicate !== true`. Drena a fila via RPC `pending_booking_request_deliveries` e fecha cada linha com `complete_booking_request_delivery`.
- `travel_files` é criado por gatilho (`quote_booking_requests_ensure_file` → `ensure_travel_file`), independente da notificação.

## 2. Destinatários que recebem e-mail hoje

Linhas criadas pela RPC (verificado na definição viva da função):

| canal | recipient_kind | status inicial |
|---|---|---|
| internal | agency | `sent` (só registro, sem envio) |
| email | agency | `pending` |
| email | client | `pending` (apenas se o cliente informou e-mail) |
| whatsapp | agency | `skipped` (motivo: "Nenhuma integracao de WhatsApp configurada") |

Distribuição real em produção confirma exatamente esses 4 tipos de linha (nenhuma linha `consultant`, nenhuma linha whatsapp diferente de `skipped`).

- Resolução do endereço da agência: `pending_booking_request_deliveries` devolve `agency_user_id` = `r.agency_id` para `agency`; `notify.ts` busca o e-mail com `supabase.auth.admin.getUserById` (nunca exposto ao público). Sem e-mail → `skipped`.
- Cliente: usa `recipient_email` gravado na fila (e-mail normalizado no servidor).
- Divergência encontrada: `src/lib/bookingRequestRecipients.ts` (e os testes em `src/test/booking-request-review.test.ts`) especificam também um e-mail para o `consultant` autor quando `user_id <> agency_id`. A RPC viva NÃO cria essa linha (`'consultant'` não aparece no corpo da função). O renderer suporta o caso (`recipient_kind !== 'client'`), mas ele nunca acontece hoje.
- Envio via Resend direto (`https://api.resend.com/emails`, `RESEND_API_KEY`), remetente fixo `Agentes de Sonhos <fernando.nobre@agentesdesonhos.com.br>` — não usa a infraestrutura de app emails/templates React (não existe `_shared/transactional-email-templates`).

## 3. Assunto e conteúdo atuais

E-mail da agência (`renderAgencyEmail`):
- Assunto: `Nova solicitação de reserva {protocol} — {trip_title || destination || "Orçamento"}`
- Corpo: título `{protocol} · v{version}`; Cliente; Contato (`whatsapp · email`); Orçamento/destino; Serviços (string concatenada); Valor apresentado (Intl pt-BR); Observações (se houver); aviso "não é uma reserva confirmada"; botão "Abrir no CRM" → `https://app.agentesdesonhos.com.br/crm` (link genérico, sem id do pedido/file).

E-mail do cliente (`renderClientEmail`):
- Assunto: `Recebemos sua solicitação de reserva — {protocol}`
- Corpo: saudação com nome; "Sua solicitação para {trip}"; **Protocolo**; **Serviços solicitados**; aviso de reconfirmação; assinatura `— {agency_name}`. Sem valores, sem datas, sem link.

## 4. Identificador exibido

Os dois e-mails usam **apenas `protocol`** (`PR-YYYYMMDD-XXXXXXXX`). O número oficial do processo (`travel_files.file_number_display`, "File nº 0000001") **não** aparece em nenhum e-mail: `pending_booking_request_deliveries` não retorna esse campo (confirmado na função viva — `file_number` não consta no corpo). O `file_number` é buscado só em `index.ts` para a resposta ao navegador. Conclusão: **o e-mail atual não usa o número de pedido oficial** definido na memória do projeto.

## 5. Dados que o renderer recebe hoje (`DeliveryRow`)

`delivery_id, channel, recipient_kind, recipient_email, protocol, version, status, client_name, client_email, client_whatsapp, client_notes, currency, total_estimated, quote_id, destination, trip_title, agency_name, agency_user_id, opportunity_id, service_names`.

Ausentes: número do file, datas da viagem (`start_date`/`end_date`), passageiros (adultos/crianças), valores por serviço, tipo de serviço, quantidades, modo de precificação (itemizado/pacote), condições/forma de pagamento, link direto para o pedido no CRM ou para o token público, nome do consultor autor.

## 6. Como `service_names` é montado

`string_agg(i.service_name, ', ' ORDER BY i.service_name)` sobre `quote_booking_request_items` — apenas nomes concatenados em ordem alfabética, sem valores, sem tipo, sem quantidade, sem os `snapshot` jsonb. Nada de itens estruturados chega ao renderer.

## 7. WhatsApp

- Existe o canal na fila (`channel = 'whatsapp'`), sempre inserido com `status = 'skipped'` e `skipped_reason` fixo; `recipient_phone` é sempre `NULL` (por decisão: não gravar o telefone do cliente como telefone da agência).
- `notify.ts` só reclama linhas `channel = 'email'` (filtro dentro do CTE `claimed`).
- Nenhuma referência a Twilio, ContentSid, template WhatsApp ou provedor de mensageria em `supabase/functions` para esse fluxo. **Confirmado: nada é enviado por WhatsApp hoje** — apenas placeholder de auditoria.

## 8. Dados já persistidos no servidor (base confiável para um resumo)

- `quote_booking_requests`: protocol, version, root_request_id, quote_id, user_id, agency_id, client_id, opportunity_id, status, client_name/email/whatsapp/notes, disclaimer_accepted_at + disclaimer_text_snapshot, currency, total_estimated (recalculado no banco), revised_total, expires_at, public_access_token, idempotency_key, source_ip_hash.
- `quote_booking_request_items`: service_type, service_name, `snapshot` jsonb (linha completa de `quote_services` menos timestamps → datas, cidade, fornecedor, condições de pagamento, imagens), amount_snapshot, quantity, selection_mode_snapshot, choice_group_snapshot, review_status.
- `travel_files`: file_number/`file_number_display`, primary_destination, destinations[], start_date, end_date, adults/children/passengers_count + passengers_snapshot, currency, pricing_mode, requested_amount, status, responsible_team_member_id, opportunity_id, client_id. Além de `travel_file_services` (produto, fornecedor, cidade, datas, quantidade, valor, status).
- `quotes`: destination, trip_title, pricing_mode, package_total_amount, total_amount, payment terms.

Ou seja: já é possível montar um resumo completo sem confiar em nada enviado pelo navegador.

## 9. Mudança mínima e segura para um resumo único (e-mail + WhatsApp)

Escopo sugerido (não implementado):
1. Estender `pending_booking_request_deliveries` para devolver, além do que já devolve: `file_number_display` (join em `travel_files` por `root_request_id`/`current_request_id`), `start_date`, `end_date`, `adults_count`, `children_count`, `pricing_mode`, `hides_individual_amounts` e um `items` jsonb agregado (`service_type`, `service_name`, `quantity`, `amount_snapshot`, datas e condições de pagamento extraídas do `snapshot`).
2. Criar um único módulo compartilhado (ex. `supabase/functions/_shared/bookingRequestSummary.ts`) que receba essa linha e produza uma estrutura normalizada `BookingRequestSummary` + um array ordenado de blocos de texto (`lines`). E-mail HTML/texto e a futura mensagem de WhatsApp renderizam a partir do mesmo array, garantindo texto e ordem idênticos.
3. `notify.ts` passa a usar esse módulo (2 variantes de audiência: `agency` e `client` — a do cliente omite dados internos), incluindo o número oficial "File nº". Nenhuma mudança de fila, idempotência ou canais.
4. WhatsApp continua `skipped` até existir provedor; quando existir, basta o mesmo `lines` e uma nova função de envio, sem tocar no renderizador.

## 10. Privacidade e segurança — pontos observados

- Isolamento por agência: fila e RPCs são `SECURITY DEFINER` com `EXECUTE` revogado de `anon`/`authenticated` e concedido só a `service_role`; toda linha carrega `agency_id`. O resumo deve continuar derivando tudo do `request_id` (nunca de parâmetros do cliente).
- Preços: totais e itens vêm de `quote_services`/`quote_booking_request_items` calculados no banco (`v_items_sum`, modo pacote com `package_total_amount`). O navegador envia somente ids de serviços — manter assim.
- E-mail da agência resolvido server-side via `auth.admin.getUserById`; nunca exposto ao público. Manter.
- Idempotência: `idempotency_key` na requisição + `ON CONFLICT DO NOTHING` na fila + `duplicate !== true` antes de notificar. Reenvios não geram novo aviso.
- Logs: mensagens de erro sem PII (`provider-error status=...`, `rpc-error`), respostas ao público genéricas em português. Único cuidado a manter: não logar `to`, telefone, nome ou observações no futuro renderer.
- Respeitar `hides_individual_amounts` do orçamento: se o orçamento oculta valores por serviço, o resumo do **cliente** não deve reintroduzi-los (o e-mail da agência pode conter os valores internos).

## Payload recomendado para a mensagem compartilhada (proposta)

```text
BookingRequestSummary {
  file_number_display: "0000123"      // identificador oficial na comunicação
  protocol: "PR-20260822-AB12CD34"    // uso interno/técnico
  version: 2
  created_at
  client: { name, email, whatsapp }   // omitido/parcial na versão do cliente
  trip:   { title, destination, start_date, end_date, adults, children }
  pricing:{ currency, mode: itemized|package, total, hide_item_amounts: bool }
  items: [ { type, name, quantity, amount, start_date, end_date,
             city, supplier, payment_terms } ]
  notes: string|null
  disclaimer: string                  // snapshot já persistido
  links: { crm_file_url, public_request_url }  // por audiência
  audience: "agency" | "client"
}
```

Ordem única dos blocos (e-mail e WhatsApp): identificação (File nº / versão) → cliente e contatos → viagem (destino, datas, passageiros) → serviços solicitados (nome, quantidade, datas, valor quando permitido) → total e forma/condições de pagamento → observações → aviso de que não é reserva confirmada → link de ação.

# Auditoria (somente leitura) — Pedido de reserva pelo orçamento web

Nada foi alterado: nenhum código, migração, configuração ou dado. Apenas leitura de arquivos e consultas SELECT.

## Resumo executivo

O recurso existe como **backend completo + configuração no editor de orçamento**, mas **não existe na página pública do orçamento**. Não há seleção de serviços pelo cliente, nem formulário, nem botão de envio, nem tela de tratamento no CRM, nem notificações. O fluxo ponta a ponta **não funciona hoje** (0 pedidos gravados no banco).

## 1. Gates que liberam o recurso

Combinação de três condições — **plano Premium não libera nada** e **domínio White Label não é gate**:

- Entitlement de agência `booking_requests` (`src/hooks/useAgencyEntitlements.ts:19`, rótulo/descrição linhas 27 e 33), concedido manualmente por agência.
- Flag por orçamento `quotes.booking_requests_enabled` (editor: `src/components/quote/QuoteBookingRequestSettings.tsx:40,52,86`).
- Revalidação no servidor no momento do envio: `agency_has_entitlement(v_agency,'booking_requests')` + flag do orçamento (migração `20260807172622_...sql:93-97`), mais o trigger `enforce_quote_booking_entitlement` e `enforce_quote_service_selection_rules`.
- Prazo opcional `quotes.booking_deadline` (linhas 100-105).

Estado atual dos dados: `agency_entitlements` com `entitlement_key='booking_requests'` → **0 linhas** (0 ativas). Ou seja, **nenhuma agência tem o recurso hoje**.

## 2. Interface pública

`src/pages/OrcamentoPublicoV2.tsx` apenas carrega via RPC `get_quote_by_public_code` e delega para `src/pages/OrcamentoPublico.tsx`. Busca por "booking" em `OrcamentoPublico.tsx`, `OrcamentoPublicoV2.tsx` e `src/components/quote/*` retorna ocorrências **somente** em `QuoteBookingRequestSettings.tsx` (componente do editor, usado em `src/pages/GerarOrcamento.tsx`).

**Não existe** na página pública: checkbox/seleção de serviços, renderização de grupos de escolha (`quote_service_choice_groups`), formulário de contato, aceite do disclaimer ou botão "enviar pedido".

## 3. `submit-booking-request`

Existe (`supabase/functions/submit-booking-request/index.ts`, registrada em `supabase/config.toml:107` com `verify_jwt = false`) e é sólida: rate limit 8/60s, validação em `validate.ts`, hash de IP, chamada via service role. **Nenhuma chamada do frontend**: a única referência em `src/` é um teste de payload (`src/test/booking-request-payload.test.ts`). Não há `functions.invoke("submit-booking-request")` em nenhum lugar.

## 4. O que a RPC faz no CRM

`public.submit_quote_booking_request` (SECURITY DEFINER, EXECUTE só para `service_role`) **não cria nem atualiza cliente e não cria oportunidade**. Ela apenas:

- valida idempotência, disclaimer, slug da agência, orçamento publicado (`FOR UPDATE`), entitlement, prazo;
- normaliza a seleção (dedup, força serviços `required`) e valida grupos `alternative` (exatamente 1) e `free` (min/max);
- versiona pedidos anteriores do mesmo e-mail (marca o anterior como `superseded`);
- insere em `quote_booking_requests`, `quote_booking_request_items` (snapshot imutável dos serviços) e `quote_booking_request_events`.

`client_id` e `opportunity_id` são **copiados do orçamento** (linha 165): se o orçamento já tem cliente/oportunidade, herda; se não tem, ficam nulos. Não há upsert em `clients` nem insert em `opportunities`.

## 5. Tela no CRM/painel

**Não existe.** Nenhum arquivo em `src/` lê `quote_booking_requests` (a única menção fora de `types.ts` é a Edge Function). Não há componente `BookingRequest*` de listagem, revisão por item, reprecificação ou aprovação, apesar de o modelo suportar todos esses estados (`src/types/bookingRequest.ts:7-28`).

## 6. Notificações

- Internas (in-app): **não implementadas**.
- E-mail (Resend): **não implementado** — nenhum disparo na Edge Function nem na RPC.
- WhatsApp: **não implementado**.
- **Apenas preparado**: a tabela `quote_booking_request_events` registra `request_received` / `request_superseded`, servindo de gancho natural para notificação futura; a agência recebe nome, e-mail e WhatsApp do cliente no pedido.

## 7. Conversão para Operações

**Não existe.** `quote_booking_request_items.operation_service_id` existe como coluna (migração `20260807172508_...sql:69`, tipada em `src/types/bookingRequest.ts:79`), mas nenhuma função, trigger ou código preenche esse campo. Também não há conversão para reserva confirmada; o status `converted` nunca é atingido por código.

## 8. Fases completas x lacunas

Completo:
- Modelo de dados (`quote_booking_requests`, `quote_booking_request_items`, `quote_booking_request_events`), protocolo, token público, versionamento, triggers de imutabilidade/append-only, `recalculate_booking_total`.
- Entitlement por agência e configuração por orçamento no editor (habilitar, prazo, disclaimer, modos de seleção e grupos).
- Endpoint público seguro com validação, rate limit e RPC transacional.

Lacunas que impedem o ponta a ponta:
1. UI pública de seleção + formulário + submit (bloqueador principal).
2. Chamada da Edge Function pelo frontend.
3. Painel da agência para ver/tratar pedidos.
4. Vínculo CRM: criar/associar cliente e oportunidade quando o orçamento não tiver.
5. Notificações (interna, e-mail, WhatsApp).
6. Conversão para Operações/reserva.
7. Nenhuma agência com o entitlement ativo.

## 9. Agências sem o recurso

Permanecem **inalteradas**. O gate é aditivo em três camadas: sem entitlement, `QuoteBookingRequestSettings` não libera a configuração; sem `booking_requests_enabled`, a RPC recusa; e como a página pública não renderiza nada de pedido de reserva, não há qualquer mudança visual ou funcional para quem não tem o recurso.

## 10. Riscos observados

- **Recurso "meio entregue"**: se o entitlement for concedido a uma agência hoje, ela verá a configuração no editor e presumirá que o cliente pode pedir reserva — mas a página pública não oferece isso. Risco de expectativa quebrada.
- **Pedido órfão**: sem vínculo automático a cliente/oportunidade e sem painel nem notificação, um pedido enviado ficaria invisível para a agência.
- **Derivação de slug por texto**: a RPC recalcula o slug a partir de `profiles.agency_name` (linhas 84-90) em vez de usar a fonte canônica de slug/domínio; renomear a agência quebraria links públicos existentes.
- `IP_HASH_SALT` cai em fallback para a service role key quando ausente (`index.ts:40-42`) — funciona, mas acopla o hash a um segredo rotacionável.

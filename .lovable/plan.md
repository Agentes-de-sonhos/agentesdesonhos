# Auditoria somente leitura — "Solicitação de reserva pelo orçamento web"

Nada foi alterado (código, banco ou configuração). Tudo abaixo foi verificado em código, migrações, funções do banco e políticas RLS reais.

Arquivos-chave: `src/components/quote/QuoteBookingRequestSettings.tsx` (config), `src/components/quote/QuoteBookingRequestPanel.tsx` + `QuoteBookingWizardDialog.tsx` (público), `src/lib/quoteBookingRules.ts`, `src/lib/quoteBookingSelection.ts`, `src/lib/quoteBookingWizard.ts`, `src/hooks/useQuoteBookingConfig.ts`, `src/hooks/useBookingRequestCapability.ts`, `supabase/functions/submit-booking-request/{index,validate,notify}.ts`.
Funções no banco: `agency_can_use_booking_requests`, `current_agency_can_use_booking_requests`, `enforce_quote_booking_entitlement`, `enforce_quote_service_selection_rules`, `normalize_quote_choice_group`, `reset_services_on_choice_group_delete`, `submit_quote_booking_request`, `sync_booking_request_opportunity`, `booking_request_negotiation_stage`, `import_booking_request_into_operation`, `agency_public_slug_matches`.
Testes: `src/test/quote-booking-rules.test.ts`, `quote-booking-selection.test.ts`, `quote-booking-wizard.test.ts`, `booking-request-payload.test.ts`, `booking-request-fix.test.ts`, `booking-request-final-fix.test.ts`, `booking-request-review.test.ts`, `booking-request-modal-contact.test.ts`, `quote-settings-step3.test.tsx`.

## 1. Elegibilidade e habilitação — funciona hoje
- Regra única no servidor: `agency_can_use_booking_requests(agency)` = assinatura **premium ativa e não expirada** em `subscriptions` + **pelo menos 1 linha ativa em `agency_public_domains`** (White Label ativo).
- Frontend: `useBookingRequestCapability` chama `current_agency_can_use_booking_requests()`; se falso, o bloco de configuração **não é renderizado** (`QuoteBookingRequestSettings` retorna `null`). O bloco vive na Etapa 3 (`GerarOrcamento.tsx`, ~linha 1810).
- Backend: trigger `trg_enforce_quote_booking_entitlement` em `quotes` (BEFORE INSERT/UPDATE OF `booking_requests_enabled`) rejeita ativação de agência não elegível. O envio público revalida de novo no RPC.
- Flag salva: `quotes.booking_requests_enabled boolean NOT NULL DEFAULT false`.
- Página pública: `get_public_quote_by_code` só devolve `booking_requests_enabled = true` se a agência **ainda** for elegível; `OrcamentoPublico.tsx` (linha 1777) só monta o painel nesse caso. Desligado = orçamento tradicional, sem vestígio do fluxo.
- Pacote fechado (`pricing_mode = 'package'`): o painel muda para "Solicitar reserva deste pacote", todos os serviços aparecem travados ("Incluído na proposta"), o wizard não abre e o total é o valor do pacote.

## 2. Prazo para o cliente responder — funciona parcialmente
- Campo `quotes.booking_deadline date` (nullable), editado por input `type=date`, salvo no `onBlur`.
- O servidor bloqueia de fato: `submit_quote_booking_request` retorna "O prazo para solicitar a reserva deste orcamento terminou." quando `now()` passa de `deadline + 1 dia`, e grava `expires_at` no pedido. O dia do prazo é inteiro (inclusivo).
- **Timezone:** o corte usa `(date + 1)::timestamptz` no fuso do banco (UTC), não no fuso do viajante — a virada pode ocorrer 21h de Brasília do dia do prazo. Sem teste cobrindo isso.
- **Nada é exibido ao cliente**: não há menção ao prazo em `QuoteBookingRequestPanel.tsx`. O cliente só descobre o vencimento ao tentar enviar.
- Vazio = sem prazo. Passado = envio recusado. Alterado = vale imediatamente para novos envios, sem afetar pedidos já criados.
- **Sem relação com `valid_until`/validade geral do orçamento**: campos independentes, sem cruzamento.

## 3. Aviso exibido ao cliente — divergência relevante
- Campo `quotes.booking_disclaimer text NOT NULL`, com default igual ao texto do editor.
- **O texto editado pela agência não aparece na página pública.** O painel exibe a constante fixa `BOOKING_REQUEST_DISCLAIMER` de `src/lib/quoteBookingSelection.ts`; o `booking_disclaimer` só é usado como snapshot no banco (`disclaimer_text_snapshot`).
- O checkbox de concordância existe no modal de envio e `validateBookingContact` exige o aceite. O backend exige `disclaimer_accepted = true` na Edge Function (`validate.ts`) **e** no RPC, e grava `disclaimer_accepted_at` + `disclaimer_text_snapshot` (itens imutáveis por `enforce_booking_item_snapshot_immutable`; eventos append-only).
- Risco: alterar o texto depois não altera pedidos antigos (bom), mas o snapshot guarda um texto que **o cliente nunca leu** — a prova não corresponde à tela.

## 4. Regras por serviço
- Valores possíveis (CHECK em `quote_services.selection_mode`): `optional`, `required`, `alternative`, `free`. Default `'optional'` — serviços antigos/sem regra são Opcionais automaticamente.
- Significado real:
  - `optional`: entra no wizard; enviado só se o cliente disser "Quero reservar".
  - `required`: **não entra no wizard** (`isDecidableService`), aparece travado como "Incluído na proposta", não pode ser recusado e é somado no servidor mesmo se ausente do payload.
  - `alternative`: exige grupo tipo alternativa; escolher um recusa os concorrentes.
  - `free`: exige grupo tipo livre; várias escolhas no mesmo bloco.
- Serviço opcional **pode ficar pendente** e o envio ainda ocorre, desde que haja ≥1 item efetivo e os grupos estejam válidos. Não há exigência de avaliar todos.
- `hide amounts` / pacote: em pacote e nos layouts `consolidated`/`legacy` o total exibido é o do pacote e os valores individuais somem; `bookingSelectionTotal` **nunca** distribui nem inventa valores (retorna "A confirmar com a agência").
- **Duplicar orçamento perde tudo:** `duplicateQuoteMutation` (`src/hooks/useQuotes.ts`) não copia `selection_mode`, `choice_group_id`, os grupos, nem `booking_requests_enabled`/`booking_disclaimer`/`booking_deadline`. A cópia volta a "todos opcionais, fluxo desligado". Excluir serviço remove o vínculo por FK/`pruneBookingDecisions`.

## 5. Grupos de escolha
- Tabela `quote_service_choice_groups` (`id, quote_id, user_id, title, group_type, min_select DEFAULT 0, max_select NULL, order_index`). FK em `quote_services.choice_group_id` com `ON DELETE SET NULL`.
- RLS: dono (`quotes.user_id = auth.uid()`, policy ALL) + equipe com `can_team('quotes.view'/'quotes.edit')` sobre a agência resolvida. O público lê apenas via RPC (`choice_groups`, sem `user_id`).
- `trg_normalize_quote_choice_group` força `min=1, max=1` para `alternative` e normaliza `user_id` para o dono do orçamento.
- Alternativa = **exatamente 1**, obrigatoriamente (cliente e servidor recusam 0 escolhas). Livre = **0 a ilimitado** na prática, porque a UI não expõe `min_select`/`max_select` (criado sempre 0/NULL). O servidor respeita min/max quando existem, mas nada na interface os define.
- Criação/edição: nome + tipo no bloco de configuração; renomear por `onBlur`; excluir devolve os serviços para `optional` (`reset_services_on_choice_group_delete`). **O tipo do grupo não é editável.**
- Associação: ao escolher `alternative`/`free` no dropdown do serviço, o sistema vincula ao primeiro grupo compatível; um segundo seletor permite trocar. Desassociar = mudar para Opcional/Obrigatório (o trigger zera `choice_group_id`).
- Misturar tipos de serviço no mesmo grupo é permitido (hotel + voo). **Serviço `required` dentro de grupo é impossível** — o trigger anula o grupo.
- Ordenação no wizard: ordem do orçamento (seções → serviços), com o bloco mantido contíguo na posição do seu primeiro membro (`buildBookingWizardSteps`).
- Escolher uma alternativa marca as demais como **"no"** explicitamente (`applyBookingDecision`), não apenas desmarca.
- O servidor revalida: o RPC percorre todos os grupos do orçamento e confere as contagens; não confia no cliente.

## 6. Matriz de conflitos e precedência
| Combinação | Comportamento atual | Julgamento |
| --- | --- | --- |
| optional sem grupo | Entra no wizard, livre | válido |
| required sem grupo | Travado, sempre enviado | válido |
| optional em grupo alternative | Impossível persistir: trigger anula `choice_group_id` quando o modo não é alternative/free | válido (bloqueado) |
| optional em grupo free | Idem: grupo anulado | válido (bloqueado) |
| required em grupo alternative/free | Impossível: grupo anulado pelo trigger | válido (bloqueado) |
| `alternative`/`free` sem `choice_group_id` | Trigger levanta exceção; a UI bloqueia e marca o seletor em vermelho | válido |
| `choice_group_id` de grupo de outro orçamento | Exceção "Grupo de escolha inválido para este orçamento" | válido |
| grupo excluído depois | FK `SET NULL` + trigger devolve serviços para `optional` | válido |
| grupo `alternative` **sem nenhum serviço vinculado** | O cliente ignora (o modelo filtra grupos vazios), mas o RPC exige "exatamente 1" e **bloqueia todo envio** | **bug / estado sem saída** |
| pacote fechado + qualquer regra | Servidor ignora seleção e grupos: envia todos os serviços e usa o total do pacote | válido, mas as regras por serviço ficam inertes |

## 7. Persistência no navegador
- `localStorage`, chave `booking-wizard:<quoteId>` (`bookingWizardStorageKey`), valor `{ decisions, reviewed }`. **Sem TTL/expiração.**
- Reabrir retoma decisões; `pruneBookingDecisions` descarta ids inexistentes (serviço removido, regra virou `required`).
- Orçamento duplicado tem outro `id` → começa limpo.
- **Sim, outra pessoa no mesmo navegador/dispositivo herda as escolhas** do mesmo link (apenas ids de serviço, sem dados pessoais).
- `reviewed` é gravado sempre como `false` e nunca lido para decidir nada: **campo morto hoje**.

## 8. Envio e backend — funciona hoje
- `selected_service_ids` = decisões "yes" + `required` (`effectiveSelectionIds`); o RPC soma novamente os `required` e, em pacote, ignora a lista e pega todos os serviços.
- Mínimo de 1 item validado nos dois lados ("Selecione pelo menos um serviço").
- Grupos e `required` são validados **no RPC**, não na Edge Function (`validate.ts` só valida formato: slug, code ≥12, UUIDs, ≤100 ids, e-mail/WhatsApp, `disclaimer_accepted`, `idempotency_key`).
- Idempotência: `idempotency_key` único; repetição devolve o mesmo pedido com `duplicate: true` e **não** notifica de novo. Rate limit 8 req/min por IP; IP guardado só como hash SHA-256.
- Snapshots: cada item guarda `snapshot` (linha inteira do serviço), `amount_snapshot`, `selection_mode_snapshot`, `choice_group_snapshot`, protegidos por trigger de imutabilidade. `quote_booking_request_events` é append-only.
- Valor da oportunidade (`sync_booking_request_opportunity`): soma dos itens; em pacote, `package_total_amount` → `total_amount` → total do pedido.
- CRM: uma única oportunidade por orçamento; etapa **Negociação** via `booking_request_negotiation_stage` (fallback para a última etapa comercial), e nunca regride oportunidade `closed`/`lost`. Gera histórico + follow-up para o dia seguinte, uma única vez por pedido.
- Identidade: se `quotes.client_id` existe, o servidor **usa o cliente cadastrado e ignora o contato digitado** (a UI nem pede). Sem cliente vinculado, exige nome + (WhatsApp ou e-mail) e cai em `ensure_client_and_opportunity_for_lead`. Novo pedido do mesmo cliente versiona e marca o anterior como `superseded`.
- Operações: **não é automático** — `import_booking_request_into_operation(operation_id)` copia os itens do pedido ativo para `operation_services` com `is_confirmed/is_paid/is_issued/is_delivered = false` e nota "Reconfirmar disponibilidade e valores", atualiza `sale_amount`, e é idempotente. Checklists seguem as regras normais de Operações.
- Notificações (`notify.ts`): registro interno marcado `sent`; e-mails para agência/consultor/cliente via `RESEND_API_KEY` com status `sent`/`failed`/`skipped`; **WhatsApp sempre `skipped`** ("Nenhuma integracao de WhatsApp configurada"). Falha de e-mail não derruba o pedido.

## 9. Limitações, riscos e o que não está implementado
Funciona hoje: elegibilidade dupla (front+banco), regras por serviço com enforcement em trigger, grupos alternativa/livre, wizard com navegação livre, idempotência, snapshots imutáveis, CRM com oportunidade única em Negociação, versionamento/supersede, e-mails.

Funciona parcialmente:
- Prazo: bloqueia no servidor, mas **não é comunicado ao cliente** e usa o fuso do banco.
- Grupo livre: `min_select`/`max_select` existem e são validados, mas **sem UI** — sempre 0/ilimitado.
- Importação para Operações: existe, mas depende de ação manual do usuário.

Não implementado:
- Exibir o `booking_disclaimer` da agência na página pública (hoje mostra texto fixo).
- Copiar regras/grupos/config ao duplicar orçamento.
- Editar o tipo do grupo; reordenar grupos pela UI; WhatsApp de notificação.
- Uso real do flag `reviewed`.

Riscos:
- **Grupo alternativa vazio bloqueia 100% dos envios** sem sinal ao cliente nem à agência.
- Divergência rótulo/realidade: "Aviso exibido ao cliente" não é o aviso exibido.
- Decisões em `localStorage` sem expiração, compartilháveis entre pessoas no mesmo dispositivo.
- Em pacote fechado, os dropdowns de regra por serviço continuam visíveis e sem efeito prático.
- `validateBookingConfig` na ativação é só client-side (o banco garante consistência serviço-a-serviço, não do conjunto).

## 10. Exemplos concretos
A) **5 hotéis, escolher exatamente 1** — criar grupo tipo Alternativa ("Hotéis em Orlando") e colocar os 5 hotéis em modo Alternativa nesse grupo. O wizard mostra os 5 seguidos; dizer "sim" em um marca os outros como "não"; enviar sem escolher é bloqueado.
B) **2 transfers independentes (ambos, um ou nenhum)** — deixar os dois como Opcional, sem grupo. Nada obriga escolha; o envio apenas exige ao menos 1 item no orçamento inteiro. Um grupo Livre também serviria, mas hoje não acrescenta limite algum.
C) **Seguro obrigatório + passeios opcionais** — seguro em Obrigatório (travado como "Incluído na proposta", fora do wizard, sempre no pedido); passeios em Opcional, decididos um a um no wizard.
D) **2 voos de ida e 2 de volta** — sim, exige **dois grupos Alternativa separados** ("Ida" e "Volta"). Um único grupo permitiria só 1 voo no total. Como o tipo de serviço não limita nada, cada grupo pode conter o par correto.
E) **Pacote fechado (hotel + aéreo + transfer)** — regras e grupos são ignorados: o cliente vê todos os itens travados, o botão é "Solicitar reserva deste pacote", e o valor registrado é o total do pacote (`package_total_amount`), não a soma dos itens.

## Incertezas
- Não foi possível comprovar o fuso efetivo do banco em produção para o corte do prazo (o `::timestamptz` depende do `TimeZone` da sessão).
- Nenhum teste automatizado cobre prazo vencido, grupo alternativa vazio, nem a perda de regras na duplicação.
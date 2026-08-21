# Vitrine de serviços no orçamento público (White Label)

Substituir o wizard "quero/não quero" por uma experiência de explorar → comparar → selecionar → revisar → solicitar, sem checkout e sem confirmação automática, reaproveitando todo o backend atual de solicitação de reserva.

## 1. Diagnóstico da estrutura atual (nomes reais)

**Rotas públicas**
- `/orcamento/:token` → `src/pages/OrcamentoPublico.tsx` (legado por `share_token`).
- `/:agencySlug/:accessCode` e domínio White Label → `src/pages/OrcamentoPublicoV2.tsx` → RPC `get_quote_by_public_code` → renderiza o mesmo `OrcamentoPublico` via overrides (`quoteOverride`, `agencySlugOverride`, `accessCodeOverride`). `PublicCodeResolver` decide pelo hostname.
- Leitura pública 100% por RPC `SECURITY DEFINER`: `get_quote_by_share_token`, `get_quote_by_public_code`, ambos usando `build_public_quote_payload(quotes)`, que devolve `quote` (sem `client_id`, `share_token`, `user_id`), `services`, `sections`, `choice_groups`, `entry_extras`, `agent_profile`, além de `booking_requests_enabled` já resolvido no servidor e `has_linked_client`. Documentos: `get_public_quote_documents_by_share_token` / `_by_public_code`. Não há `SELECT` anon direto nas tabelas.

**Organização do orçamento**
- `public.quote_sections`: `id, quote_id, user_id, title, order_index, created_at, updated_at`. Sem destino/datas/tipo.
- `public.quote_services.section_id` (uuid, nullable) + `order_index` (int, default 0). Hoje 108 de 2.398 serviços têm seção.
- Puro: `src/lib/quoteSections.ts` (`buildQuoteSectionLayout`, `visibleSectionGroups`, `flattenServiceOrder`, `moveServiceInLayout`, `reorderSectionsByIds`) — coberto por `src/test/quote-sections.test.ts`.
- Admin: `QuoteServicesOrganizer.tsx` (dnd-kit, criar/renomear/excluir/reordenar seções). Público: `PublicSectionAccordion.tsx` (acordeão colapsado com contador).

**Conjuntos de escolha**
- `public.quote_service_choice_groups`: `id, quote_id, user_id, title, group_type ('alternative' | 'free'), min_select (default 0), max_select (nullable), order_index`. Hoje 5 grupos, todos `alternative`; 13 serviços vinculados.
- `quote_services.selection_mode` (default `'optional'`; valores `optional | required | alternative | free`) + `choice_group_id`. Triggers: `normalize_quote_choice_group`, `enforce_quote_service_selection_rules`, `enforce_quote_booking_entitlement`.
- Admin: `QuoteBookingRequestSettings.tsx` + `useQuoteBookingConfig.ts` + regras puras `src/lib/quoteBookingRules.ts`.

**Seleção do passageiro (atual)**
- `QuoteBookingRequestPanel.tsx` (655 linhas) + `QuoteBookingWizardDialog.tsx` (653 linhas) + regras `src/lib/quoteBookingWizard.ts` (passos sequenciais, decisão `yes`/`no`, troca automática em grupo `alternative`, progresso, `localStorage` em `booking-wizard:<quoteId>`) e `src/lib/quoteBookingSelection.ts` (`buildBookingSelectionModel`, `toggleBookingSelection`, `validateBookingSelection`, `bookingSelectionTotal`, `effectiveSelectionIds`, `BOOKING_REQUEST_DISCLAIMER`).
- Resumo/cards: `src/lib/quoteServiceDigest.ts` + `ServiceDigestCompact.tsx` (tipo, nome real, local, datas, quantidade, thumb opcional via `ResolvedServiceThumb`).
- Valores: `src/lib/quotePricing.ts` (`isPackagePricing`, `hidesIndividualAmounts`), `src/lib/quoteCurrency.ts`, `PublicInvestmentSummary.tsx`.

**Envio**
- Edge Function `submit-booking-request` (rate limit 8/60s, `validate.ts`, `notify.ts`, hash de IP) → RPC `submit_quote_booking_request` (SECURITY DEFINER, resolve preços/snapshots, protocolo, idempotência, versão, `public_access_token`).
- Tabelas: `quote_booking_requests` (+ itens/eventos, tipos em `src/types/bookingRequest.ts`), `travel_files` (`formatFileNumber`), oportunidade no CRM (`ensure_client_and_opportunity_for_lead`, `booking_request_negotiation_stage`, `auto_create_operation_on_close`), `useHasBookingRequest.ts` no CRM.

## 2. O que já existe e será reaproveitado (sem alteração de contrato)
- Toda a leitura pública por RPC e a projeção pública — a nova UX consome exatamente o mesmo payload.
- `quoteSections.ts`, `quoteBookingSelection.ts`, `quoteServiceDigest.ts`, `ServiceDigestCompact`, `quotePricing`, `quoteCurrency`.
- Edge Function, RPC de envio, protocolo/File, idempotência, histórico, notificações, oportunidade e operação: **nada muda**.
- Grupos `alternative`/`free` com `min_select`/`max_select` já modelam escolha única e múltipla.

## 3. Lacunas entre atual e desejado
1. UX pública é obrigatoriamente sequencial (`buildBookingWizardSteps` + decisão `yes`/`no` por serviço); não há vitrine navegável nem comparação lado a lado.
2. Não existe componente persistente "Minha seleção" com contador (o resumo só aparece no fim do wizard).
3. Não há "Ver detalhes" por serviço no fluxo de seleção (o digest é sempre compacto).
4. Seção é apenas `title`: sem destino, período e tipo opcionais para agrupar/rotular a vitrine.
5. Não há numeração "Opção 1, 2..." reiniciando por conjunto na UI pública.
6. Grupos não têm vínculo com seção nem rótulo de obrigatoriedade explícito para exibição (`min_select` existe, mas não é comunicado).
7. Estado da seleção é `decisions` (`yes`/`no`), não um carrinho de ids; falta migração suave desse `localStorage`.
8. Sem status discreto por conjunto ("escolha 1 opção", "opcional", "3 de 5 selecionados").

## 4. Menor alteração estrutural no banco (proposta, sem migration)
Tudo opcional e retrocompatível; se nada for aplicado, a nova UX ainda funciona (fallback do item 7).

- `quote_sections`: `destination text NULL`, `start_date date NULL`, `end_date date NULL`, `service_type text NULL` (livre, validado no app com a lista hospedagem/aéreo/transfer/passeio/ingresso/seguro/cruzeiro/locação/pacote/outros). Nenhum default novo; `NULL` = Grupo livre (comportamento atual).
- `quote_service_choice_groups`: `section_id uuid NULL REFERENCES quote_sections(id) ON DELETE SET NULL` e `is_required boolean NOT NULL DEFAULT false` (derivável de `min_select > 0`; a coluna só existe se quisermos separar "obrigatório" de "mínimo").
- `build_public_quote_payload`: incluir os novos campos nas projeções de `sections` e `choice_groups` (mesma função, mesma assinatura — sem mudança de rota/token).
- Nada de nova tabela, nenhuma coluna obrigatória, nenhum backfill.

## 5. Componentes existentes a modificar
- `src/components/quote/QuoteBookingRequestPanel.tsx` — passa a orquestrar a vitrine + "Minha seleção" + pop-up final (mantém contato, disclaimer, submit e estado de sucesso intactos).
- `src/components/quote/QuoteBookingWizardDialog.tsx` — deixa de ser o caminho obrigatório; mantido como modo "revisar passo a passo" opcional ou removido da rota principal no fim da Etapa 4.
- `src/lib/quoteBookingSelection.ts` — reaproveitar `toggleBookingSelection`/`validateBookingSelection` como fonte única do carrinho (acrescentar validação por `min_select`/`max_select` e mensagem por conjunto).
- `src/components/quote/QuoteServicesOrganizer.tsx` + `useQuotes.ts` — campos opcionais de seção (destino/datas/tipo) no diálogo de criação/edição.
- `src/components/quote/QuoteBookingRequestSettings.tsx` + `useQuoteBookingConfig.ts` — expor `min_select`/`max_select` e obrigatoriedade do conjunto; opcionalmente vincular conjunto a uma seção.
- `src/lib/quoteServiceDigest.ts` — acrescentar um nível "detalhes" (campos já cadastrados por tipo, com ênfase em hospedagem: quartos, regime, categoria, fotos).
- `src/pages/OrcamentoPublico.tsx` — ponto de montagem da vitrine e do elemento persistente (sem alterar a apresentação da proposta em si).

## 6. Componentes novos sugeridos
- `src/lib/quoteBookingShowcase.ts` — puro: monta a vitrine (seções → conjuntos → serviços), numeração de opções por conjunto, status por conjunto, validação agregada e serialização do carrinho.
- `QuoteBookingShowcase.tsx` — lista de blocos da vitrine.
- `BookingChoiceSetBlock.tsx` — cabeçalho do conjunto (nome, destino/período/tipo, status discreto) + grade de opções.
- `BookingServiceCard.tsx` — card objetivo (thumb, tipo, nome, local, datas, valor conforme configuração) + "Ver detalhes" + ação Adicionar/Selecionar/Selecionado.
- `BookingServiceDetailsSheet.tsx` — `Dialog` no desktop / `Sheet` inferior no mobile, com galeria e campos do tipo de serviço.
- `MySelectionBar.tsx` — barra inferior fixa no mobile e botão/contador discreto no cabeçalho do desktop.
- `MySelectionPanel.tsx` — resumo agrupado por seção (destino/período/tipo) com remover/trocar e CTA "Solicitar reserva".

## 7. Regras exatas de seleção e validação
- `selection_mode = 'required'`: sempre incluído, exibido como "Incluído na proposta", sem ação de remover.
- Serviço avulso (`optional`, sem `choice_group_id`): adicionar/remover livre.
- Conjunto `alternative`: escolher 1; selecionar outro troca automaticamente (`toggleBookingSelection` já faz isso). Bloqueia envio somente se `min_select >= 1`.
- Conjunto `free`: nenhum/um/vários/todos; respeitar `min_select` (mínimo) e `max_select` (máximo, ao atingir o limite as demais opções mostram "trocar" em vez de "adicionar"). Sem `max_select` = ilimitado.
- Pertencimento apenas por `choice_group_id`. Nunca inferir alternativa por destino/período/tipo.
- Numeração "Opção N" reinicia em cada conjunto, na ordem de `order_index` dos serviços.
- Pacote fechado (`isPackagePricing`): seleção bloqueada, tudo incluído, apenas "Solicitar reserva" (comportamento atual preservado).
- Valores: respeitar `hidesIndividualAmounts` e a ocultação de total; quando ocultos, cards e resumo não exibem números.
- Envio bloqueado só por: conjunto obrigatório sem mínimo atendido, `max_select` excedido, ou seleção vazia. Mensagens por conjunto, nunca genéricas.
- **Fallback (orçamento antigo)**: sem `quote_sections` → uma lista única sem cabeçalho; sem `choice_groups` → todos os serviços como avulsos com adicionar/remover; seções sem os novos campos → Grupo livre (só o nome). Nenhum caso exige migração manual.

## 8. UX desktop
- Vitrine em coluna única de blocos; dentro de cada conjunto, grade de 2–3 cards comparáveis de altura uniforme.
- Cabeçalho do conjunto: nome, chips discretos de destino/período/tipo e status ("Escolha 1 opção", "Opcional", "2 de 3 selecionados").
- Card: thumb 4:3, tipo, nome real, local, datas, valor (quando permitido), "Ver detalhes" (Dialog) e ação primária.
- Estado "Selecionado": borda/realce em token semântico, ícone de check, ações "Remover" / "Trocar por outra opção".
- "Minha seleção": botão discreto com contador no cabeçalho fixo da proposta, abrindo painel lateral com o resumo agrupado e o CTA.
- Microfeedback: transição curta no card + atualização do contador; sem toasts a cada clique.

## 9. UX mobile
- Recomendação: **barra inferior fixa** ("Minha seleção · N itens" + "Solicitar reserva"), com `safe-area-inset-bottom`; escolhida em vez do botão flutuante porque acumula contador, valor opcional e CTA sem cobrir conteúdo.
- Cards em coluna única, carrossel horizontal apenas para fotos (nunca rolagem horizontal de layout).
- "Ver detalhes" e "Minha seleção" abrem `Sheet` inferior com scroll interno e swipe-down.
- Conjunto com muitas opções: mostrar as 3 primeiras + "Ver todas as N opções".
- Alvos de toque ≥ 44px; zero rolagem horizontal em 320px.

## 10. Compatibilidade e rollout
- Nenhum link, token, código ou slug muda; nenhuma rota nova.
- Leitura pública continua exclusivamente pelas RPCs existentes — nenhum `SELECT` anon direto é reintroduzido.
- Vitrine ativada pela mesma condição de hoje (`booking_requests_enabled` resolvido no servidor); orçamentos sem isso não mudam em nada.
- Flag interna de UI (`showcase` vs `wizard`) durante as Etapas 2–4 para permitir voltar ao fluxo antigo sem novo deploy de banco.
- Migração do `localStorage`: ler `booking-wizard:<quoteId>` e converter `yes` em itens do carrinho na primeira abertura; gravar no novo formato depois.
- Sem mudanças em PDF, compartilhamento, CRM, carteira, roteiro, protocolo/File, idempotência, histórico, notificações e `agency_showcases` (vitrine pública permanece separada).

## 11. Riscos e testes
| Risco | Mitigação / teste |
|---|---|
| Seleção divergente da validação do servidor | Regras puras em `quoteBookingShowcase.ts` espelhando `submit_quote_booking_request`; testes unitários de `min/max`, alternative, required |
| Orçamento legado sem seções/grupos | Testes de fallback com listas vazias (padrão de `quote-sections.test.ts`) |
| Pacote fechado permitir remover item | Teste explícito `packageMode` |
| Vazamento de valores ocultos | Teste de render com `hidesIndividualAmounts` e total oculto |
| Regressão dos 3 formatos de link | Playwright anônimo em `share_token`, `slug/código` e domínio White Label, verificando zero request ≥400 |
| Duplicidade de pedido | Manter `idempotencyKey` por abertura do pop-up; teste do estado de sucesso |
| Rolagem horizontal mobile | Verificação a 320/375px com screenshot |

## 12. Etapas de implementação
1. **Regras puras** — `quoteBookingShowcase.ts` + testes (carrinho, min/max, numeração, fallback, pacote). *Aceite:* suíte verde, nenhum componente alterado.
2. **Vitrine pública (leitura)** — cards, detalhes e blocos de conjunto sobre o payload atual, ainda com o wizard como CTA. *Aceite:* os 3 links renderizam a vitrine sem erro e sem valores indevidos.
3. **Minha seleção + envio** — barra/painel persistente, CTA, disclaimer e submit pela Edge Function atual. *Aceite:* pedido real gerado com protocolo/File e oportunidade no CRM, idêntico ao fluxo anterior.
4. **Desligar o wizard obrigatório** — vitrine como caminho padrão; wizard vira revisão opcional. *Aceite:* nenhuma tela exige "quero/não quero".
5. **Metadados opcionais de seção e conjunto** *(depende da aprovação do item 4 do banco)* — colunas opcionais, projeção na RPC e campos no admin. *Aceite:* orçamentos antigos inalterados; novos exibem destino/período/tipo.
6. **Polimento e regressão** — responsividade, microfeedback, Playwright nos 3 formatos, `vite build` e suíte completa.

Ordem recomendada: 1 → 2 → 3 → 4 → 6, com a Etapa 5 encaixada depois da 4 (ou adiada sem prejuízo).

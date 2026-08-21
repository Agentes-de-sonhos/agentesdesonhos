# Orçamento público — seleção por cards e "Minha seleção"

## 1. Diagnóstico da estrutura atual (verificado)

**Banco**
- `quote_sections` (42 linhas): `id, quote_id, user_id, title, order_index`. É puramente visual — nenhum campo semântico (destino, período, tipo).
- `quote_service_choice_groups` (5 linhas, todas `alternative`, todas com `min_select=1, max_select=1`): `title, group_type ('alternative'|'free'), min_select, max_select, order_index`. Já existe o conceito de "conjunto de escolha", mas não é vinculado a uma seção. Há `CHECK quote_choice_groups_alternative_single` (alternative ⇒ min=1 e max=1) e o trigger `normalize_quote_choice_group` que força esses valores.
- `quote_services`: `section_id`, `selection_mode ('optional'|'required'|'alternative'|'free')`, `choice_group_id`. Hoje em produção: 2375 `optional` e 13 `alternative`.
- Fluxo de pedido já pronto e funcionando: `submit_quote_booking_request` (valida grupos no servidor, cria `quote_booking_requests` + `quote_booking_request_items` com snapshots, protocolo, `public_access_token`, idempotência), `sync_booking_request_opportunity`, `booking_request_file_number`, `booking_request_negotiation_stage`, `import_booking_request_into_operation`, deliveries/notificações (`pending_booking_request_deliveries`, `complete_booking_request_delivery`). 3 pedidos reais registrados.
- `get_quote_by_public_code` **já devolve** `services`, `sections` e `choice_groups` (com min/max), além de `booking_requests_enabled` e `has_linked_client`, sem expor `client_id`.

**Frontend**
- Configuração pela agência: `QuoteServicesOrganizer.tsx` (seções, drag-and-drop, `src/lib/quoteSections.ts`) e `QuoteBookingRequestSettings.tsx` + `useQuoteBookingConfig.ts` + `src/lib/quoteBookingRules.ts` (grupos e modo de seleção por serviço).
- Público: `OrcamentoPublico.tsx` renderiza seções via `buildQuoteSectionLayout`; `QuoteBookingRequestPanel.tsx` monta o modelo (`src/lib/quoteBookingSelection.ts`) e abre `QuoteBookingWizardDialog.tsx` (653 linhas), que é justamente o fluxo sequencial "quero / não quero" por serviço (`src/lib/quoteBookingWizard.ts`, decisões `yes|no` persistidas em localStorage).
- `src/lib/quoteServiceDigest.ts` + `ServiceDigestCompact.tsx` já resolvem nome real, thumb e resumo por tipo de serviço — reaproveitáveis nos cards.

**Conclusão:** o backend do pedido está correto e não precisa ser reconstruído. O que falta é (a) semântica no grupo/seção e (b) uma UX de vitrine no lugar do wizard sequencial.

## 2. Alterações de banco (mínimas, todas aditivas)

1. `quote_sections`: adicionar `kind text default 'free'` (`'free'|'structured'`), `destination text`, `start_date date`, `end_date date`, `service_type text` — todos nulos/default, então seções antigas continuam sendo "grupo livre".
2. `quote_service_choice_groups`: adicionar apenas `service_type text`. **Não** haverá coluna `is_required` e **não** haverá `section_id` (ver item 4 abaixo).
3. **Fonte única de obrigatoriedade: `min_select`.** O toggle "Obrigatório/Opcional" da interface grava exclusivamente `min_select` (obrigatório ⇒ `min_select = 1`; opcional ⇒ `min_select = 0`). `max_select` cuida somente do limite superior. Nenhum outro campo, flag ou `selection_mode` participa da decisão de obrigatoriedade — não existe precedência a resolver porque não existe segunda fonte.
4. **Escolha única opcional passa a ser possível** relaxando o que hoje trava isso:
   - substituir o CHECK `quote_choice_groups_alternative_single` por `group_type <> 'alternative' OR (max_select = 1 AND min_select IN (0,1))`;
   - ajustar `normalize_quote_choice_group` para forçar apenas `max_select := 1` quando `group_type='alternative'`, preservando o `min_select` informado (`0` ou `1`, com fallback `1` quando nulo).
   Resultado: única obrigatória = `min 1 / max 1`; única opcional = `min 0 / max 1`; múltipla = `min 0..n / max n|null`.
5. `submit_quote_booking_request`: a validação de grupo passa a ser genérica por `min_select`/`max_select` (`count >= min_select` e, quando `max_select` não é nulo, `count <= max_select`), substituindo o caso especial "alternative exige exatamente 1". Para `min 1 / max 1` o resultado é idêntico ao atual.
6. Nada é removido além do CHECK reescrito. "Serviço único" continua sendo serviço sem grupo (`optional`/`required`).

## 3. Componentes modificados

- `QuoteServicesOrganizer.tsx` — editor de seção ganha alternância Livre/Estruturada e os campos opcionais (destino, período, tipo).
- `QuoteBookingRequestSettings.tsx` / `useQuoteBookingConfig.ts` / `quoteBookingRules.ts` — criar grupos `free`, marcar grupo como obrigatório, vincular grupo a uma seção; sugestões de agrupamento (mesmo tipo + período) apenas como **sugestão**, nunca automáticas.
- `OrcamentoPublico.tsx` — passa a renderizar a nova vitrine de seleção quando `booking_requests_enabled`.
- `QuoteBookingRequestPanel.tsx` — deixa de abrir o wizard; passa a hospedar o estado da seleção + a barra "Minha seleção" + revisão/contato/envio (estados Compacto / Resumo / Sucesso já existentes são preservados).
- `get_quote_by_public_code` — incluir os novos campos de seção/grupo no payload.

## 4. Componentes novos

- `src/lib/quoteChoiceSets.ts` — monta a árvore `seção → conjunto de escolha → opções` a partir de sections/groups/services, numera "Opção N" **por conjunto**, e expõe o status do conjunto (escolhido / pendente / opcional).
- `src/components/quote/public/SelectableServiceCard.tsx` — card objetivo (foto, nome, categoria, local, período, regime, valor conforme configuração) com "Ver detalhes" e ação de seleção.
- `src/components/quote/public/ServiceDetailsSheet.tsx` — detalhes completos em sheet/modal responsivo.
- `src/components/quote/public/ChoiceSetBlock.tsx` — título do conjunto + instrução ("Escolha uma das opções", "Escolha quantos desejar") + status.
- `src/components/quote/public/MySelectionBar.tsx` — sacola persistente com contador (header/flutuante no desktop, barra inferior fixa no mobile) e drawer de resumo agrupado por seção.
- `QuoteBookingWizardDialog.tsx` é mantido no repositório apenas durante a transição e removido na Etapa 5.

## 5. Regras de seleção propostas

- Conjunto `alternative`: escolha única — selecionar outra opção troca automaticamente, sem perguntar sobre a anterior; feedback "Opção atualizada".
- Conjunto `free`: múltipla livre, respeitando `min_select`/`max_select` quando definidos.
- Serviço sem grupo: `optional` = adicionar/remover; `required` = sempre incluído e não removível.
- Pacote fechado (`pricing_mode = 'package'`) continua bloqueado, com tudo incluído.
- Bloqueio de envio somente para conjunto explicitamente obrigatório (`alternative`, ou `free` com `is_required`/`min_select > 0`).
- Nenhuma inferência: dois hotéis no mesmo destino/período só competem se a agência os colocar no mesmo conjunto.

## 6. Compatibilidade com orçamentos existentes

- Orçamento sem seções: os serviços aparecem em um bloco único "Sua viagem", cada um como serviço único.
- Seções antigas: `kind = 'free'`, sem destino/período — renderizam como hoje (só título).
- Serviços `optional` sem grupo: comportamento idêntico ao atual (adicionar/remover).
- Os 13 serviços `alternative` existentes e seus 5 grupos passam a ser exibidos como conjunto de escolha única — mesma regra que o servidor já valida.
- Os 3 pedidos já registrados e todo o histórico/CRM permanecem intactos: nenhuma coluna de `quote_booking_requests*` muda.

## 7. UX desktop

Vitrine dentro da própria página do orçamento: seção com título, destino e período; conjuntos com instrução; cards em grade 2–3 colunas com "Ver detalhes" e "Selecionar esta opção"; "Minha seleção" fixa no topo/flutuante com contador; drawer lateral com resumo por seção; CTA "Enviar solicitação de reserva" com o aviso de que não há confirmação automática.

## 8. UX mobile (prioritária)

Cards em coluna única, imagem proporcional, zero rolagem horizontal; barra inferior fixa com 🛒 contador + "Revisar seleção"; drawer full-height para o resumo; sheet de detalhes responsivo com fechamento por swipe; microanimação curta (escala + check) no card ao selecionar, sem bloquear a rolagem; CTA nunca sobrepõe conteúdo (padding inferior compensado).

## 9. Riscos e regressões

- Divergência entre validação do cliente e do servidor em grupos `free` obrigatórios — mitigado mantendo `quoteBookingSelection.ts` como fonte única e espelhando a regra no RPC.
- Remover o wizard afeta os testes existentes (`quote-booking-wizard.test.ts`, `quote-booking-selection.test.ts`) — serão reescritos para a nova árvore.
- Decisões salvas em localStorage pela chave `booking-wizard:<quoteId>` ficam órfãs — nova chave versionada, com descarte silencioso da antiga.
- Orçamentos com muitos serviços podem pesar no mobile — imagens via `ResolvedServiceImage` com lazy loading.
- Exibição de valores deve continuar respeitando `hide_service_amounts` / pacote fechado.

## 10. Etapas de implementação

1. Migração aditiva (seções estruturadas + campos de grupo) e atualização de `get_quote_by_public_code`.
2. `quoteChoiceSets.ts` + testes puros das regras (única / múltipla / serviço único / obrigatoriedade / numeração por conjunto).
3. UI da agência: seção estruturada e conjuntos (criar `free`, marcar obrigatório, vincular à seção, sugestões não automáticas).
4. Vitrine pública: cards, detalhes, conjuntos, microinteração.
5. "Minha seleção" + revisão + envio pelo RPC atual; remoção do wizard sequencial.
6. Ajuste do RPC para grupo `free` obrigatório e testes de regressão do fluxo ponta a ponta (pedido → protocolo/file → oportunidade CRM → notificações), incluindo domínio White Label e orçamentos legados.

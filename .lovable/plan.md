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

## 1.1 Escopo obrigatório — somente contas com White Label

Toda a evolução (cards selecionáveis, conjuntos de escolha, seções estruturadas e "Minha seleção") vale **exclusivamente** para agências com White Label habilitado, atuais e futuras.

**Fonte de verdade já existente (verificada no banco):** a função `public.agency_can_use_booking_requests(_agency_id uuid)` (SECURITY DEFINER, STABLE), que exige simultaneamente:
- assinatura ativa em `public.subscriptions` com `plan = 'premium'` e `is_active`, vigência válida (`expires_at` nulo ou futuro);
- pelo menos uma linha ativa em `public.agency_public_domains` (`user_id = agência`, `is_active = true`) — este é o sinal de White Label habilitado.

Derivadas dessa mesma função, já em uso:
- `public.current_agency_can_use_booking_requests()` → consumida pelo hook `src/hooks/useBookingRequestCapability.ts` (UI interna da agência);
- `public.get_quote_by_public_code(p_agency_slug, p_code)` → já resolve a agência com `resolve_agency_id_for_user(quote.user_id)`, chama `agency_can_use_booking_requests` e devolve `quote.booking_requests_enabled` **calculado no servidor**, sem sessão do visitante.

Portanto **não é necessário criar entitlement novo** (requisito 5 não se aplica): a fonte de verdade existe, é dinâmica e é avaliada por consulta — nenhuma lista de `agency_id`, slug, domínio ou nome de cliente será introduzida em nenhum ponto.

**Como o gate é aplicado**
- Experiência pública do passageiro: a nova vitrine só é montada quando `quote.booking_requests_enabled === true` (valor vindo do RPC). Quando `false`, `OrcamentoPublico.tsx` renderiza exatamente o layout atual de seções — mesmo componente, mesmos estilos, nenhum ramo novo executado. Sem regressão visual ou comportamental para contas sem White Label.
- Configuração da agência: as novas opções (seção Estruturada, criação de conjuntos, toggle Obrigatório/Opcional, limites) ficam atrás de `useBookingRequestCapability()`; contas não elegíveis seguem vendo apenas seções livres como hoje.
- Servidor continua a autoridade: `submit_quote_booking_request` mantém a revalidação de elegibilidade, então nem um cliente adulterado consegue enviar pedido em conta não elegível.
- Como a elegibilidade é uma consulta (não um valor copiado), qualquer conta que passe a ter White Label ativo + Premium recebe a nova experiência **na sessão seguinte / próximo carregamento do link público**, sem migração nem alteração de código.
- Cobertura de rotas públicas: o gate depende só do `quote` retornado pelo RPC, que é o mesmo em qualquer caminho de acesso — domínio personalizado (`AgencyDomainGate`/`AgencyDomainRoutes`), rota `/{agency_slug}/{access_code}`, `/orcamento/:token` e domínio `seuorcamento.tur.br`. `agency_public_slug_matches` já aceita tanto o slug do domínio White Label ativo quanto o slug derivado do perfil (fallback), então nenhum caminho suportado perde a nova UX.

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
- `QuoteBookingRequestSettings.tsx` / `useQuoteBookingConfig.ts` / `quoteBookingRules.ts` — criar grupos `free`, toggle Obrigatório/Opcional gravando só `min_select`, limite opcional em `max_select`; sugestões de agrupamento (mesmo tipo + período) apenas como **sugestão**, nunca automáticas. O conjunto não recebe seção manualmente: sua seção é derivada dos serviços que o compõem.
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

- Conjunto `alternative` (`max_select = 1`): escolha única — selecionar outra opção troca automaticamente, sem perguntar sobre a anterior; feedback "Opção atualizada". Com `min_select = 0` o cliente pode não escolher nenhuma; com `min_select = 1` precisa escolher uma.
- Conjunto `free`: múltipla, respeitando `min_select` (0 = opcional) e `max_select` quando definido.
- Serviço sem grupo: `optional` = adicionar/remover; `required` = sempre incluído e não removível.
- Pacote fechado (`pricing_mode = 'package'`) continua bloqueado, com tudo incluído.
- Bloqueio de envio **exclusivamente** quando `min_select >= 1` não é atendido — mesma expressão no cliente (`quoteBookingSelection.ts`) e no RPC.
- Nenhuma inferência: dois hotéis no mesmo destino/período só competem se a agência os colocar no mesmo conjunto.

### Coerência entre conjunto e seção

A coluna `section_id` no conjunto seria uma segunda fonte de verdade sobre onde o conjunto aparece e poderia divergir do `section_id` dos serviços. Por isso ela é **eliminada da proposta**: `quoteChoiceSets.ts` deriva a seção do conjunto a partir dos serviços que o integram (a seção do primeiro serviço na ordem salva). Consequências:

- Um conjunto cujos serviços estão em seções diferentes é renderizado uma única vez, na seção do primeiro serviço, e a UI da agência exibe um aviso ("as opções deste conjunto estão em seções diferentes") com ação de mover todas para a mesma seção — sem bloquear o envio.
- O servidor não precisa validar coerência alguma: a regra de escolha depende só de `choice_group_id`, `min_select` e `max_select`, e a seção é apenas apresentação.

## 6. Compatibilidade com orçamentos existentes

- Orçamento sem seções: os serviços aparecem em um bloco único "Sua viagem", cada um como serviço único.
- Seções antigas: `kind = 'free'`, sem destino/período — renderizam como hoje (só título).
- Serviços `optional` sem grupo: comportamento idêntico ao atual (adicionar/remover).
- **Grupos legados preservados (verificado):** os 5 grupos existentes estão todos com `group_type='alternative', min_select=1, max_select=1`. Como a obrigatoriedade continua sendo lida de `min_select`, eles permanecem obrigatórios exatamente como hoje, e os 13 serviços `alternative` mantêm `choice_group_id`/`selection_mode` intactos. A migração **não faz UPDATE em dados** — apenas troca o CHECK e o trigger para *permitir* `min_select=0`; nenhum grupo legado opcional é convertido em obrigatório (e não existe nenhum grupo opcional hoje).
- Nova regra genérica do RPC (`count >= min_select` e `count <= max_select`) devolve resultado idêntico ao atual para `min 1 / max 1`.
- Os 3 pedidos já registrados e todo o histórico/CRM permanecem intactos: nenhuma coluna de `quote_booking_requests*` muda.

## 7. UX desktop

Vitrine dentro da própria página do orçamento: seção com título, destino e período; conjuntos com instrução; cards em grade 2–3 colunas com "Ver detalhes" e "Selecionar esta opção"; "Minha seleção" fixa no topo/flutuante com contador; drawer lateral com resumo por seção; CTA "Enviar solicitação de reserva" com o aviso de que não há confirmação automática.

## 8. UX mobile (prioritária)

Cards em coluna única, imagem proporcional, zero rolagem horizontal; barra inferior fixa com 🛒 contador + "Revisar seleção"; drawer full-height para o resumo; sheet de detalhes responsivo com fechamento por swipe; microanimação curta (escala + check) no card ao selecionar, sem bloquear a rolagem; CTA nunca sobrepõe conteúdo (padding inferior compensado).

## 9. Riscos e regressões

- Divergência entre validação do cliente e do servidor — mitigado com uma única expressão (`min_select`/`max_select`) espelhada em `quoteBookingSelection.ts` e no RPC.
- Relaxar o CHECK/trigger de `alternative` é irreversível na direção "dados"; mitigado por não alterar nenhuma linha existente.
- Remover o wizard afeta os testes existentes (`quote-booking-wizard.test.ts`, `quote-booking-selection.test.ts`) — serão reescritos para a nova árvore.
- Decisões salvas em localStorage pela chave `booking-wizard:<quoteId>` ficam órfãs — nova chave versionada, com descarte silencioso da antiga.
- Orçamentos com muitos serviços podem pesar no mobile — imagens via `ResolvedServiceImage` com lazy loading.
- Exibição de valores deve continuar respeitando `hide_service_amounts` / pacote fechado.

## 10. Etapas de implementação

1. Migração mínima: campos de seção estruturada, `service_type` no conjunto, CHECK e trigger de `alternative` relaxados para aceitar `min_select ∈ {0,1}` com `max_select = 1`; `get_quote_by_public_code` passa a devolver os novos campos.
2. `quoteChoiceSets.ts` + testes puros (única obrigatória, única opcional, múltipla com min/max, serviço único, numeração "Opção N" por conjunto, seção derivada dos serviços).
3. UI da agência: seção Livre/Estruturada, criação de conjuntos `free`, toggle Obrigatório/Opcional gravando `min_select`, aviso de conjunto com serviços em seções diferentes, sugestões não automáticas.
4. Vitrine pública: cards, "Ver detalhes", conjuntos, microinteração.
5. "Minha seleção" + revisão + envio pelo RPC atual; remoção do wizard sequencial.
6. Ajuste do RPC para a validação genérica por `min_select`/`max_select` e bateria de regressão ponta a ponta:
   - acesso **anônimo** (sem sessão) ao link público;
   - identificação da agência pelo **domínio White Label** e pelo formato `/{agency_slug}/{access_code}`;
   - respeito integral a `hide_service_amounts`, valores detalhados e pacote fechado (nenhum valor inventado ou distribuído);
   - **idempotência** do envio (mesma `idempotency_key` retorna o pedido existente, sem duplicar);
   - geração/preservação de **protocolo e número de file** (`generate_booking_request_protocol`, `booking_request_file_number`);
   - **CRM**: oportunidade única em etapa de Negociação (`sync_booking_request_opportunity`, `booking_request_negotiation_stage`) e importação em operação existente;
   - **notificações/deliveries** (`pending_booking_request_deliveries`, `complete_booking_request_delivery`) e histórico do pedido;
   - orçamentos **legados** (sem seções, sem grupos) e os 5 grupos existentes continuam funcionando;
   - responsividade: smartphone pequeno/grande, tablet e desktop, sem rolagem horizontal.
7. Regressão específica de **elegibilidade White Label** (comparativa, sempre pela fonte de verdade, nunca por lista fixa):
   - **conta White Label atual** (Premium + `agency_public_domains.is_active`): vê vitrine, conjuntos e "Minha seleção"; envio funciona ponta a ponta;
   - **conta que recebe White Label depois**: com o domínio inativo/ausente o link público mostra o layout atual; ao ativar a linha em `agency_public_domains` (sem qualquer deploy), o mesmo link passa a exibir a nova experiência e a UI interna libera as novas configurações;
   - **conta sem White Label** (inclusive Premium sem domínio ativo e não-Premium com domínio): layout público idêntico ao atual — snapshot antes/depois, nenhum componente novo montado, nenhuma chave de localStorage nova, e o RPC continua devolvendo `booking_requests_enabled = false`;
   - **acesso por domínio personalizado** de conta elegível: nova UX presente, tema/branding White Label preservados;
   - **acesso por URL pública alternativa/fallback** (`/{agency_slug}/{access_code}` com slug do perfil, `/orcamento/:token`, `seuorcamento.tur.br`): mesmo resultado do domínio personalizado, comprovando que o gate não depende do hostname;
   - **tentativa de envio forçada** por conta não elegível (chamada direta ao RPC/Edge Function): rejeitada no servidor;
   - **compatibilidade de dados**: as colunas novas continuam existindo para todas as contas (requisito 7), mas nenhuma superfície de UI nova é exibida a contas não elegíveis.

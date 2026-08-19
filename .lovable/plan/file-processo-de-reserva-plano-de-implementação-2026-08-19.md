# File / Processo de Reserva — plano de implementação

## Decisão de arquitetura (após auditoria)

A auditoria mostrou que:
- A autoridade de gravação da solicitação é o RPC `submit_quote_booking_request` (chamado pela Edge Function `submit-booking-request`), que já resolve cliente, oportunidade única (`sync_booking_request_opportunity`), snapshots dos itens e histórico append-only.
- `operations` é uma tabela de execução operacional pré-existente, com semântica de viagem já vendida. Evoluí-la para virar a raiz do processo criaria efeitos em indicadores de venda e não atende os status comerciais pedidos.

**Decisão:** criar uma entidade própria `public.travel_files` como raiz do processo, reaproveitando tudo o que existe (solicitação, itens, eventos, entregas, oportunidade, cliente) por referência — sem duplicar dados — e ligando `operations.travel_file_id` para que Operações seja apenas a visão operacional do mesmo file.

## Fases

### Fase 1 — Núcleo no banco
- `travel_files`: uuid, `agency_id` (user_id da agência), `file_number` (int) + `file_number_display` (7 dígitos), cliente, oportunidade, orçamento, solicitação raiz, vendedor responsável, responsável operacional, destino principal e demais destinos, período, passageiros (contagem + snapshot), moeda, valor solicitado / reconfirmado / final, status do processo, status operacional, status financeiro, datas de abertura/confirmação/cancelamento/conclusão, motivo de cancelamento, timestamps.
- `travel_file_services`: um registro por item do pedido, com dados estruturados (tipo, nome real do produto, hotel/ingresso/passeio/locação, fornecedor + id, cidade/destino/país, datas, quantidade, passageiros, valor solicitado/reconfirmado/vendido, custo, comissão, responsável) e status próprio por serviço, além do snapshot preservado.
- `agency_file_counters`: contador por agência com bloqueio de linha, sequência começando em `0000001`, sem reinício anual e sem reuso; `UNIQUE (agency_id, file_number)`.
- RLS por agência + permissões de equipe; GRANTs explícitos; índices para agência, número, cliente, responsável, status e período.
- Histórico: reutiliza `quote_booking_request_events` (append-only) e acrescenta eventos de mudança de status do file.

### Fase 2 — Criação idempotente
- Função `ensure_travel_file(request_id)` transacional e idempotente, chamada dentro do fluxo autoritativo do `submit_quote_booking_request`.
- Uma solicitação raiz = um file = uma oportunidade principal. Idempotência e revisões nunca criam outro file nem outra oportunidade; revisões aparecem como `Revisão 2`, `Revisão 3`.
- Somente serviços selecionados e obrigatórios entram no file; recusados ficam apenas no histórico. Pacote fechado usa o valor do pacote; itemizado usa a soma congelada.

### Fase 3 — Bloqueio de exclusão do orçamento
- Trigger `BEFORE DELETE` em `quotes` que bloqueia a exclusão quando existir solicitação ou file, com mensagem de negócio.
- Frontend: uma única operação transacional de exclusão (sem apagar serviços antes), tratando o erro e exibindo o texto “Este orçamento não pode ser excluído… origem do File nº 0000001”.

### Fase 4 — Migração dos dados existentes
- Backfill seguro, não destrutivo e idempotente: um file por solicitação raiz, ordem determinística, numeração por agência, protocolos `PR-…` preservados, snapshots/eventos/entregas/oportunidades/clientes intactos, sem reenviar notificações.

### Fase 5 — Experiência pública
- Tela de sucesso passa a exibir **Processo de reserva nº 0000001** com o aviso de que a solicitação não confirma a reserva. Nada sensível no link público; o número curto nunca dá acesso.

### Fase 6 — Aba Reservas em Meus Projetos
- Nova aba única **Reservas** (sem aba “Solicitações” paralela) com filtros por etapa, busca por número/cliente/destino/vendedor/período/status, cards responsivos com os campos pedidos e indicador de não visualizado.

### Fase 7 — Página de detalhes do File
- Página interna com Visão geral, Serviços (dados congelados + controles de reconfirmação), Histórico e Documentos/Observações. Sem abas vazias de Financeiro/Comissão.
- Orçamento de origem mantém `Publicado` + etiqueta `Reserva solicitada` + `File 0000001`; cópia de orçamento nunca herda file/solicitação/oportunidade.

### Fase 8 — Notificações
- Reutiliza a infraestrutura dos leads (`NewLeadAlertProvider`, sino, card do dashboard): pop-up uma única vez, leitura por usuário, contador na aba Reservas, atividade e tarefa no CRM, e-mail. WhatsApp somente se houver integração real (não será simulado).

### Fase 9 — Testes
- Cobertura dos 25 casos exigidos (numeração por agência, concorrência, idempotência, revisões, etiquetas, exclusão, seleção de serviços, pacote x itemizado, oportunidade, notificações, isolamento entre agências, permissões, cópia de orçamento, migração e número curto sem acesso público).

## Garantias
- Nenhum dado real será excluído; “Daniel Cesar de Moraes (cópia)” usado apenas para leitura/validação do vínculo.
- Fora de escopo mantido fora: rankings, comissão final, emissão/pagamento automático, disponibilidade em tempo real, WhatsApp simulado.

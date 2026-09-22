# Fase 1 — Fechamento unificado da venda (file → operação → venda)

Objetivo desta fase: uma única ação **"Confirmar venda e iniciar operação"** que, de forma transacional e idempotente, fecha a oportunidade, confirma o file, cria/reutiliza **uma** operação e **uma** venda financeira, com linhagem de origem preservada e pagamento com status próprio. Carteira e roteiro ficam fora — apenas os vínculos são preparados.

## A. Arquitetura canônica

O **travel_file** passa a ser o eixo comercial da venda; **operations** é a execução; **sales** é o espelho financeiro.

```text
opportunity ──1:N── quotes
     │                 │
     │            (cliente escolhe)
     │                 ▼
     └──1:N──── travel_files ──1:N── travel_file_services
                    │ │                     │
       operation_id │ │ (FK)                │ (linhagem)
                    ▼ ▼                     ▼
                operations ──1:N── operation_services
                    │                       │
              (uma venda)                   │
                    ▼                       ▼
                  sales ──1:N────────── sale_products
```

Direção dos relacionamentos (apontam sempre do registro derivado para a origem):
- `travel_files.opportunity_id` → `opportunities.id` (já existe; ganha FK).
- `travel_files.operation_id` → `operations.id` (ganha FK + índice único parcial: uma operação por file).
- `operations.travel_file_id` **não** é criado — o vínculo fica só em `travel_files.operation_id` para não haver duas fontes de verdade.
- `operations.quote_id` ganha FK (`ON DELETE SET NULL`); `trip_id` e `itinerary_id` ganham FK também (preparação para a fase de carteira/roteiro).
- `sales.travel_file_id` (novo, nullable) → `travel_files.id`; `sales.source_quote_id` / `source_operation_id` / `source_trip_id` ganham FKs `ON DELETE SET NULL`.
- `operation_services.source_travel_file_service_id` (novo, nullable) → `travel_file_services.id`.
- `sale_products.source_operation_service_id` e `sale_products.source_travel_file_service_id` (novos, nullable) — linhagem financeira do serviço.

## B. Migrations aditivas, unicidade e backfill

Tudo nullable, nada removido, nada renomeado.

1. **Colunas novas**: `sales.travel_file_id`, `operation_services.source_travel_file_service_id`, `sale_products.source_operation_service_id`, `sale_products.source_travel_file_service_id`, `travel_files.sale_id` (nullable, para leitura direta), `operations.customer_payment_status` (texto, default `'pendente'`).
2. **FKs** listadas em A, todas `NOT VALID` primeiro; validação em migration posterior depois de conferir órfãos.
3. **Índices únicos parciais** (a trava real contra duplicidade):
   - `uniq_operations_by_opportunity`: `operations(opportunity_id) WHERE opportunity_id IS NOT NULL`.
   - `uniq_travel_files_operation`: `travel_files(operation_id) WHERE operation_id IS NOT NULL`.
   - `uniq_sales_travel_file`: `sales(travel_file_id) WHERE travel_file_id IS NOT NULL`.
   - `uniq_sales_opportunity`: `sales(opportunity_id) WHERE opportunity_id IS NOT NULL`.
   - `uniq_operation_services_from_file_service`: `operation_services(source_travel_file_service_id) WHERE ... IS NOT NULL`.
   - `uniq_sale_products_from_operation_service`: `sale_products(source_operation_service_id) WHERE ... IS NOT NULL`.
4. **Pré-checagem obrigatória**: antes de criar cada índice único, consultar as duplicidades existentes (`opportunity_id` com >1 operação ou >1 venda). Se houver, o índice é criado depois de uma etapa de consolidação manual revisada com você — nada é apagado automaticamente.
5. **Backfill** (aditivo, idempotente, sem apagar):
   - `travel_files.operation_id` ← operação da mesma oportunidade, quando houver exatamente uma.
   - `sales.travel_file_id` ← file da mesma oportunidade, quando houver exatamente um.
   - `operations.customer_payment_status` ← valor atual de `operations.payment_status`.

## C. RPC orquestradora

`public.travel_file_confirm_sale(_file_id uuid, _options jsonb default '{}')` — `SECURITY DEFINER`, `search_path=public`, transação única, com `SELECT ... FOR UPDATE` no file (serializa cliques concorrentes).

Passos:
1. Permissão via `private.assert_travel_file_access(_file_id, 'reservations.manage')`.
2. **Aptidão**: file não cancelado; existe cliente; existe ao menos um serviço em estado vendável (`available`, `amount_changed` reconfirmado, `booked`…); nenhum serviço obrigatório pendente de reconfirmação. Falha → exceção com mensagem de negócio em português.
3. Oportunidade → etapa `closed` (por `stage_id` do pipeline da agência, com fallback para `stage`), só se ainda não estiver.
4. File → `sale_confirmed` (reutiliza a validação de `travel_file_set_status`), grava `confirmed_at`.
5. **Operação**: reutiliza `travel_files.operation_id`; senão a operação da mesma oportunidade; senão cria uma em `venda_confirmada` com `payment_status='pendente'`. Grava `travel_files.operation_id`.
6. **Serviços da operação**: um por serviço vendável do file, ignorando os que já têm `source_travel_file_service_id` (idempotência). `is_paid` sempre `false` na criação.
7. **Venda**: reutiliza por `travel_file_id`, senão por `opportunity_id`, senão cria com `sale_amount` = soma dos valores reconfirmados, gravando `travel_file_id`, `opportunity_id`, `source_quote_id`, `source_operation_id` e `import_fingerprint` (`file:<id>`).
8. **sale_products**: ver F.
9. File → `in_operation`; `travel_files.sale_id` preenchido.
10. Evento de auditoria em `travel_file_events` (`sale_confirmed`) com os ids resultantes.
11. Retorno: `{ file_id, opportunity_id, operation_id, sale_id, created: {...}, reused: {...} }`.

**Idempotência**: uma segunda chamada não cria nada, retorna os mesmos ids com `reused` e não registra evento duplicado. Os índices únicos parciais garantem isso mesmo sob concorrência.

## D. Triggers atuais

- `handle_opportunity_closed` (cria venda): passa a ser idempotente — não insere se já existir venda com a mesma `opportunity_id`, e não insere quando a oportunidade tem travel_file (a venda vem da RPC, com os valores reais em vez da estimativa). Mantém o `clients.status='cliente_ativo'`.
- `auto_create_operation_on_close`: mantém o caminho legado (oportunidade sem file), mas passa a ignorar oportunidades que já tenham file, para a operação nascer só pela RPC com os serviços certos.
- `sync_operation_payment_status`: continua derivando apenas `operations.payment_status` dos serviços (fornecedor). A situação de recebimento do cliente passa a ficar em coluna própria (ver G).
- Nenhum trigger é removido nesta fase.

## E. Central de Reservas e funil

- Detalhe do file: botão primário **"Confirmar venda e iniciar operação"**, visível só quando o file está apto; desabilitado com o motivo exato quando não está; estado de carregamento que impede duplo clique; após sucesso, mostra número da operação e da venda com links.
- Lista de reservas: coluna/etiqueta de etapa passa a distinguir `sale_confirmed` e `in_operation`, com atalho para a operação.
- Funil de oportunidades: arrastar para "Fechada/Ganha" uma oportunidade **que tenha file** abre um aviso indicando que a confirmação é feita na Central de Reservas (a etapa muda, mas operação/venda só nascem pela RPC). Oportunidades sem file continuam exatamente como hoje.
- Nenhuma alteração em SiteLab/marcas-brancas.

## F. sale_products com linhagem

Um `sale_product` por serviço da operação criado nesta confirmação:
- `product_type` mapeado do tipo do serviço (reutiliza `src/lib/operationServiceMap.ts`);
- `description`, `supplier_name`, `sale_price` (valor reconfirmado), `cost_price` (custo do file quando existir, senão 0), comissão conforme os dados do file;
- `source_operation_service_id` e `source_travel_file_service_id` preenchidos — a trava única impede o mesmo serviço virar dois produtos;
- `commission_status` fica no default (pendente) e os recebíveis automáticos seguem o fluxo atual de `sale_products → income_entries`.

## G. Política de payment_status

Duas ideias hoje misturadas passam a ficar separadas:
- `operations.payment_status` = **pagamentos a fornecedor/emissão**, derivado de `operation_services.is_paid` (comportamento atual preservado).
- `operations.customer_payment_status` (nova) = **recebimento do cliente**, escrito apenas pelo fluxo financeiro (faturas/recebíveis). `sync_invoice_payment_to_crm` passa a gravar nessa coluna em vez de sobrescrever a outra.
- Confirmação de venda sempre nasce com ambos `pendente` — venda fechada com pagamento pendente é estado válido.
- A interface passa a exibir os dois rótulos de forma distinta ("Fornecedores" e "Cliente").

## H. Legado

- Oportunidade fechada sem file: caminho atual intacto (trigger cria operação; venda pela estimativa) — agora sem duplicar.
- Operações e vendas já existentes: só ganham vínculos pelo backfill quando o pareamento é inequívoco (exatamente um candidato). Ambíguos ficam sem vínculo e listados em um relatório de leitura para decisão sua.
- Files antigos já em `sale_confirmed`/`in_operation` sem operação: a RPC é segura para rodar sobre eles (reutiliza o que existir).

## I. Testes e aceite

Testes automatizados (Vitest, camada de regras em `src/lib/`):
1. aptidão do file (apto / obrigatório pendente / cancelado / sem cliente);
2. mapeamento serviço do file → serviço da operação → produto financeiro (tipos, valores, linhagem);
3. soma do valor da venda apenas com serviços vendáveis;
4. idempotência: mesmo payload duas vezes → mesmos ids, nada criado;
5. legado: oportunidade sem file mantém o caminho antigo;
6. payment_status: dois campos independentes, `is_paid` não altera o do cliente.

Aceite: duplo clique não duplica nada; venda fecha com pagamento pendente; serviços recusados pelo cliente não entram na operação nem no financeiro; nenhuma linha existente alterada além do backfill de vínculos; suíte completa, typecheck, lint e build OK.

## J. Rollback

- Cada lote é uma migration própria, aplicada isoladamente.
- Colunas e FKs são aditivas: desfazer = parar de usar (marcadas como deprecated), sem drop.
- A RPC nova pode ser desativada removendo o botão na interface — nenhum trigger depende dela.
- Ajustes nos triggers preservam o corpo antigo comentado na migration para reaplicação rápida.
- Índices únicos são o único ponto que pode recusar gravações: criados depois da checagem de duplicidade e removíveis sem perda de dados.

## K. Arquivos, funções e tabelas

Banco: `travel_files`, `travel_file_services`, `travel_file_events`, `operations`, `operation_services`, `sales`, `sale_products`, `opportunities`. Funções: `travel_file_confirm_sale` (nova), `handle_opportunity_closed`, `auto_create_operation_on_close`, `sync_operation_payment_status`, `sync_invoice_payment_to_crm`, `compute_operation_payment_status`, `import_booking_request_into_operation` (inalterada).

Código: `src/lib/travelFiles.ts`, `src/lib/travelFileWorkflow.ts`, `src/types/travelFile.ts`, `src/types/operations.ts`, `src/hooks/useTravelFiles.ts`, `src/components/reservas/*` (detalhe e lista), `src/hooks/useOperations.ts`, `src/components/crm/*` (aviso no funil), `src/lib/operationServiceMap.ts`, novos testes em `src/test/`.

## L. Lotes de implementação

1. **Lote 1** — migration de colunas + FKs `NOT VALID` + relatório de duplicidades (sem índices únicos ainda).
2. **Lote 2** — backfill de vínculos inequívocos + criação dos índices únicos parciais.
3. **Lote 3** — RPC `travel_file_confirm_sale` + eventos de auditoria.
4. **Lote 4** — ajuste de idempotência nos triggers de oportunidade fechada.
5. **Lote 5** — separação de `payment_status` × `customer_payment_status` (banco + interface).
6. **Lote 6** — botão único na Central de Reservas, estados e aviso no funil.
7. **Lote 7** — testes, typecheck, lint, build e atualização do roadmap/memória.

Nada é publicado ou implantado em nenhum lote.

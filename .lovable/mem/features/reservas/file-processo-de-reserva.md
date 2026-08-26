---
name: File / Processo de Reserva
description: Entidade central da venda originada no orçamento web, numeração sequencial de 7 dígitos por agência, aba Reservas e proteção do orçamento de origem
type: feature
---
- Terminologia oficial: "File nº 0000001" (interno) e "Processo de reserva nº 0000001" (cliente). Nunca chamar de protocolo na UI nova.
- Numeração: sequencial por agência, 7 dígitos, gerada por `next_agency_file_number` com lock em `agency_file_counters`. `travel_files.file_number_display` é a fonte de exibição.
- Tabelas: `travel_files` (raiz), `travel_file_services` (snapshot dos serviços), `travel_file_views` (badge de não lido, único por file+usuário).
- Criação: trigger `quote_booking_requests_ensure_file` → `ensure_travel_file` (idempotente; revisões atualizam o mesmo file, sem gerar novo número).
- Orçamento com file vinculado NUNCA pode ser excluído: trigger levanta `QUOTE_HAS_BOOKING_FILE:<numero>`, traduzido por `parseQuoteDeleteError` em `src/lib/travelFiles.ts`.
- UI: aba "Reservas" em `/meus-projetos?tab=reservas` (visível só com capacidade de booking requests) e detalhe em `/reservas/:id`. Etiqueta "Reserva solicitada · File nº" nos cards de orçamento.
- Regras de apresentação/filtros/busca vivem em `src/lib/travelFiles.ts` (fonte única). Busca por número aceita com ou sem zeros à esquerda.
- Central de Reservas (Etapa 3): indicadores por etapa, filtros avançados (período de viagem, responsável), alerta "Aguardando tratamento" após 2 dias e paginação incremental de 20 na `ReservasTab`.
- Regras de fluxo, sugestão de etapa pelos serviços, consolidação financeira (reconfirmado/vendido/custo/comissão/margem) e descrição dos eventos vivem em `src/lib/travelFileWorkflow.ts`.
- Notas internas em `travel_file_notes` (só a agência lê; autor edita/exclui a própria nota). Nunca expostas ao cliente.
- Histórico automático: triggers `log_travel_file_change` e `log_travel_file_service_change` gravam em `quote_booking_request_events` (etapa, responsáveis, status e valores de serviço). Não criar segunda tabela de reservas.

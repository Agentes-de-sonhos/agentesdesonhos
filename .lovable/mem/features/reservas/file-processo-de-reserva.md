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

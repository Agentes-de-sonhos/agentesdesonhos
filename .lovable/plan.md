# Sincronizar Follow-ups do CRM com o Google Calendar

## Objetivo
Fazer com que follow-ups criados em oportunidades (CRM) apareçam automaticamente no Google Calendar do usuário, reaproveitando toda a infraestrutura de sincronização que já existe para os eventos da Agenda (lock, debounce, idempotência, tombstones, exclusão bidirecional, cron).

## Estratégia
Em vez de duplicar a lógica de push/pull para a tabela `opportunity_followups`, vamos **espelhar cada follow-up como um `agency_events`** (tipo `followup`). Assim:

- O motor de sync existente cuida do envio para o Google.
- Tombstones, exclusão bidirecional e idempotência funcionam de graça.
- A Agenda já mostra esses eventos (hoje vem via `useAllFollowups`); passaremos a ter uma fonte única no `agency_events`.

## Mudanças

### 1. Banco de dados (migration)
- Adicionar coluna `followup_id uuid UNIQUE` em `agency_events` (referência a `opportunity_followups.id`, `ON DELETE SET NULL`).
- Trigger `AFTER INSERT/UPDATE/DELETE` em `opportunity_followups`:
  - **INSERT**: cria `agency_events` espelho com `event_type='followup'`, `event_date=follow_up_date`, `title='Follow-up: {cliente}'`, `description=note`, `client_id`, `opportunity_id`, `followup_id`.
  - **UPDATE**: atualiza o espelho (data/nota). Se já estava soft-deleted (Google removeu antes), reabre.
  - **DELETE**: marca `deleted_at = now()` no espelho (cria tombstone para o Google).
- Trigger `AFTER UPDATE OF deleted_at` em `agency_events`: quando o espelho é soft-deleted via pull do Google e tem `followup_id`, deletar a linha em `opportunity_followups` (mantém UI do CRM coerente).

### 2. Frontend
- `src/hooks/useOpportunityFollowups.ts`: após `syncFollowups` ter sucesso, chamar `triggerGoogleCalendarSync({ force: true })` (mesmo helper já usado em `useAgenda`) para que a exclusão/criação reflita imediatamente no Google sem esperar o cron.
- Extrair o helper `triggerGoogleCalendarSync` de `useAgenda.ts` para um arquivo compartilhado (`src/lib/googleCalendarSync.ts`) para reuso.
- `src/hooks/useAgenda.ts`: a query `useAllFollowups` continua existindo para o CRM, mas a Agenda passa a exibir os follow-ups via `agency_events` (`event_type='followup'`) — evita duplicação visual. Adicionar filtro no merge da Agenda para não mostrar duas vezes.

### 3. Tipos
- `defaultAgencyEventTypes` / `eventTypeColors` / `eventTypeLabels`: adicionar `followup` com cor e label "Follow-up".
- Regenerar `src/integrations/supabase/types.ts` automaticamente após a migração.

## Critérios de aceite
1. Criar follow-up no CRM → aparece automaticamente no Google Calendar em segundos.
2. Editar data/nota do follow-up → atualiza no Google.
3. Excluir follow-up no CRM → remove do Google (com tombstone, sem recriação).
4. Excluir evento "Follow-up: …" no Google → some do CRM e da Agenda.
5. Sincronizações repetidas não criam duplicatas.
6. Agenda continua mostrando os follow-ups (sem duplicar), agora pelo `agency_events`.

## Observações técnicas
- Os triggers usam `SECURITY DEFINER` e respeitam `user_id = created_by` (dono da oportunidade) para passar pela RLS de `agency_events`.
- Edge function `google-calendar-sync` não precisa de alterações: ela processa qualquer `agency_events` com `deleted_at IS NULL` para push, e usa tombstones para delete.
- O texto do título usa o nome do cliente da oportunidade (subquery na trigger). Sem cliente, cai para "Follow-up".

# browser-extension-api — ponte autenticada da extensão Chrome

Edge Function única usada pela extensão **Agente de Sonhos para WhatsApp**.
Reutiliza as tabelas existentes do CRM (`clients`, `opportunities`,
`pipeline_stages`, `opportunity_history`, `opportunity_notes`,
`opportunity_followups`). Não cria pipeline paralelo e não envia mensagens pelo
WhatsApp.

## Autenticação

- Métodos aceitos: `POST` e `OPTIONS`. Qualquer outro devolve `405`.
- Cabeçalho obrigatório: `Authorization: Bearer <access_token>` da sessão do
  usuário na plataforma. Sem JWT válido não há operação, nem leitura.
- CORS liberado por origem (`chrome-extension://<id>` não é uma origem fixa) —
  seguro porque não há cookies: a autorização é exclusivamente o Bearer.
- `agencyId` (`user_agency_id`) e `teamMemberId` (`team_self_member_id`) são
  derivados **no servidor**. `user_id`, `agency_id`, `member_id` e permissões
  enviados pelo cliente são ignorados.
- Todas as leituras e mutações **do CRM** usam o cliente Supabase com o JWT do
  usuário: o RLS permanece como autoridade final.
- **Uso administrativo limitado de service role.** As políticas RLS de
  `agency_team_permissions` e `agency_team_stage_permissions` liberam `SELECT`
  apenas ao owner (`auth.uid() = agency_id`), então um colaborador autenticado
  não consegue ler as próprias permissões pelo JWT. Para resolver isso — e
  somente quando `teamMemberId` existe — a função cria um service client usado
  exclusivamente para ler `agency_team_members`, `agency_team_permissions` e
  `agency_team_stage_permissions`. Esse client **não lê clientes/oportunidades e
  não executa nenhuma mutação**; não é criado para contas master.
- Antes de ler permissões, o service client valida o **vínculo triplo**: deve
  existir exatamente um `agency_team_members` com `status = 'active'`,
  `id = teamMemberId`, `auth_user_id = auth.uid()` e `agency_id = agencyId`.
  Qualquer divergência devolve `403` (fail-closed).
- As consultas de permissões filtram sempre por `agency_id` **e**
  `team_member_id` derivados no servidor. Falha de leitura é negação explícita
  (`403`), nunca lista vazia silenciosa.
- Rate limit: 90 requisições por minuto por usuário.

## Formato

```
POST /functions/v1/browser-extension-api
Authorization: Bearer <access_token>
Content-Type: application/json

{ "action": "lookup_contact", "phone": "(35) 99954-0212" }
```

## Ações

| Ação | Entrada | Retorno |
|---|---|---|
| `context` | — | usuário mínimo, `agencyId`, `teamMemberId`, `mode` (`master`/`collaborator`), permissões e etapas visíveis |
| `lookup_contact` | `phone?`, `name?` | `{ contact, matched_by }` ou `{ contact: null }` |
| `search_contacts` | `phone?`, `name?` (mín. 2 caracteres) | `{ contacts: [...] }` (máx. 10, busca parcial por nome com curingas escapados; telefone exato primeiro) |
| `create_contact` | `name`, `phone?` | `201 { contact }` · `409 { error, contact }` em telefone duplicado |
| `list_opportunities` | `contactId` | `{ opportunities: [...] }` (máx. 50, etapas visíveis) |
| `get_pipeline_stages` | — | `{ stages: [{ id, name, legacy_key, position, color, can_view, can_edit, can_move }] }` |
| `create_opportunity` | `contactId`, `destination`, `startDate?`, `endDate?`, `passengersCount?`, `adultsCount?`, `childrenCount?`, `estimatedValue?`, `notes?`, `followUpDate?` | `201 { opportunity }` |
| `update_opportunity_stage` | `opportunityId`, `stageId` | `{ opportunity_id, stage }` |
| `register_budget_sent` | `opportunityId`, `budgetUrl?` | `{ opportunity_id, stage }` (etapa `quote_sent`) |
| `create_followup` | `opportunityId`, `followUpDate` (AAAA-MM-DD), `note?` | `201 { followup }` |

### Ações da versão 0.4 (aditivas — 0.3 continua funcionando)

| Ação | Permissão | Entrada | Retorno |
|---|---|---|---|
| `dashboard_today` | `opportunities.view` / `agenda.view` / `operations.view` (parcial por bloco) | `timeZone?`, `horizonDays?` (1–30, default 7), `limit?` (≤50) | `followups {overdue, today, upcoming}`, `events`, `operations`, `trips`, `counts`, `links.agenda_url` |
| `get_contact_summary` | `clients.view` (+ `quotes.view` / `operations.view` para os blocos) | `contactId` | contato mínimo, empresas, oportunidades (com deep links), follow-ups, notas, histórico, orçamentos, operações, viagens |
| `update_opportunity` | `opportunities.edit` | `opportunityId` + campos seguros (`destination`, `startDate`, `endDate`, `adultsCount`, `childrenCount`, `passengersCount`, `estimatedValue`, `notes`, `travelContext`, `companyId`) | `{ opportunity }` |
| `list_followups` | `opportunities.view` | `filter` (`overdue`/`today`/`upcoming`/`all`), `timeZone?`, `horizonDays?`, `limit?` | `{ filter, today, followups }` |
| `update_followup` | `opportunities.edit` | `followupId`, `followUpAt?`/`followUpDate?`, `timeZone?`, `note?` | `{ followup }` |
| `complete_followup` | `opportunities.edit` | `followupId` | `{ followup_id, completed: true }` |
| `list_companies` | `clients.view` | `limit?` | `{ companies }` |
| `search_companies` | `clients.view` | `query` (mín. 2 caracteres), `limit?` | `{ companies }` |
| `create_company` | `clients.create` | `name`, `tradeName?`, `cnpj?`, `email?`, `phone?`, `notes?` | `201 { company }` |
| `link_contact_company` | `clients.edit` | `contactId`, `companyId`, `relationshipType?`, `isPrimary?` | `201 { link }` · `409` se já vinculado |
| `unlink_contact_company` | `clients.edit` | `contactId`, `companyId` | `{ unlinked: true }` |
| `list_contact_companies` | `clients.view` | `contactId`, `limit?` | `{ companies }` |
| `list_opportunity_quotes` | `quotes.view` | `opportunityId`, `limit?` | `{ quotes, create_quote_url }` |
| `list_opportunity_operations` | `operations.view` | `opportunityId`, `limit?` | `{ operations }` |

### Follow-up com horário e fuso (0.4)

- Colunas aditivas: `opportunity_followups.follow_up_at timestamptz NULL`,
  `opportunity_followups.time_zone text NULL` e `opportunities.follow_up_at`.
  `follow_up_date` **continua existindo** e permanece sincronizado.
- `create_followup` aceita `followUpAt` em **ISO 8601 com offset**
  (`2026-08-20T14:30:00-03:00` ou `...Z`) **ou** o legado `followUpDate`.
  Sem offset a entrada é recusada (`400`) porque o horário seria ambíguo.
- A data civil (`follow_up_date`) é derivada pelo `timeZone` validado
  (default `America/Sao_Paulo`), nunca por split simples em UTC.
- Registros antigos, com apenas `follow_up_date`, continuam **all-day**:
  nenhum horário é inventado na migração.
- O espelho em `agency_events` recebe `event_time`, `start_at`, `time_zone` e
  `all_day` coerentes; a Agenda do app mostra o horário quando existir.
- `created_by` é gravado explicitamente como `user.id`, além do trigger.

### Empresas (modelo opcional, 0.4)

- `companies`: `user_id` (agência), `name` obrigatório, `trade_name`,
  `cnpj_normalized`, `email`, `phone`, `notes`. RLS multi-tenant igual a `clients`.
- `client_companies` (N:N): `client_id`, `company_id`,
  `relationship_type` (`employee|owner|buyer|traveler|other`), `is_primary`,
  `unique(client_id, company_id)`.
- `opportunities.travel_context` (`personal` default | `corporate`) e
  `company_id`: contexto corporativo **exige** empresa; pessoal exige empresa nula.
- Empresa, cliente e oportunidade precisam pertencer à **mesma agência**
  (validado por trigger no banco, além dos filtros da função).
- Cadastro de cliente **não** passa a exigir empresa. Oportunidades antigas não
  foram alteradas.

### Deep links (sempre calculados no servidor)

A base é uma constante da função (`APP_BASE_URL`); nenhuma URL recebida no body
é usada para montar links.

- `client_url` → `/gestao-clientes/clientes?client=<uuid>`
- `opportunity_url` → `/gestao-clientes/funil?opportunity=<uuid>`
- `create_quote_url` → `/ferramentas-ia/gerar-orcamento?opportunity=<uuid>`
- `agenda_url` → `/agenda?date=<AAAA-MM-DD>`

A tela **Gerar Orçamento** passou a aceitar `?opportunity=<uuid>` para acesso
externo autenticado: a oportunidade e o cliente são lidos via RLS e alimentam o
mesmo prefill de `location.state` (que continua funcionando). Sem permissão ou
com id inexistente, aparece um aviso amigável e nada é pré-preenchido. Nenhum
dado pessoal vai na URL — apenas o UUID.

### Privacidade adicional da 0.4

- `dashboard_today` e `list_followups` devolvem **somente** follow-ups criados
  pelo usuário autenticado (`created_by = auth.uid()`): agenda de colegas nunca
  é exposta. Eventos de agenda também são filtrados por `user_id = auth.uid()` e
  ignoram registros apagados.
- Operações e viagens não trazem nenhum campo financeiro.
- Empresas devolvem apenas `cnpj_masked` (`••••1234`); CNPJ bruto e notas
  internas nunca saem.
- Toda coleção tem limite explícito (padrão 10–20, teto 50).
- O service client permanece restrito às três tabelas de permissões de equipe:
  não toca `companies`, `client_companies`, `opportunity_followups` nem
  `agency_events`.

### Regras de negócio aplicadas

- Telefone é normalizado no servidor (somente dígitos) e comparado com a coluna
  gerada `clients.phone_normalized`, sempre restrito à agência do usuário.
- `search_contacts` compara o telefone por variantes exatas: o número informado
  e, para números brasileiros, a versão com e sem o prefixo `55` (10/11 ↔ 12/13
  dígitos). Nenhuma variante é inventada para outros países. A correspondência
  por telefone tem prioridade sobre a busca por nome.
- `search_contacts` exige `clients.view`, aceita telefone e/ou nome, sempre filtra
  `user_id = agencyId` e devolve apenas campos mínimos (`publicContact`).
- Busca por nome só ocorre sem telefone utilizável: correspondência exata,
  case-insensitive, limite de 5 registros.
- Novos contatos: `user_id = agencyId`, `status = 'lead'`, origem registrada em
  `notes` e `created_by_team_member_id` quando colaborador.
- Novas oportunidades entram na primeira `pipeline_stage` da agência (menor
  `position`) e geram `opportunity_history`.
- Movimentação de etapa: master sempre pode; colaborador precisa de
  `can_move = true` **explícito** na etapa de origem e de destino em
  `agency_team_stage_permissions` (ausência de registro = negado).
- `register_budget_sent` grava uma `opportunity_note` curta e inclui a URL
  apenas quando for `http`/`https`.

## Códigos de erro

| Status | Significado |
|---|---|
| 400 | Ação desconhecida ou parâmetro inválido |
| 401 | Sem Bearer, JWT inválido ou sessão expirada |
| 403 | Sem permissão, sem `can_move`, ou mutação recusada pelo RLS |
| 404 | Contato, oportunidade ou etapa inexistente na agência |
| 405 | Método diferente de POST/OPTIONS |
| 409 | Contato duplicado por telefone normalizado |
| 429 | Rate limit por usuário |
| 500 | Falha temporária (mensagem genérica, sem stack trace) |

Erros são sempre `{ "error": "mensagem em português" }`, sem stack trace.

## Privacidade

A função devolve apenas campos mínimos: id, nome, telefone, e-mail, status e
datas do contato; destino, etapa, datas, passageiros e valor da oportunidade.
**Nunca** retorna CPF/CNPJ, documentos, credenciais, tokens ou dados de outras
agências. Nenhuma mensagem de WhatsApp é enviada por esta função.

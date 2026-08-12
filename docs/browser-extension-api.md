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

### Regras de negócio aplicadas

- Telefone é normalizado no servidor (somente dígitos) e comparado com a coluna
  gerada `clients.phone_normalized`, sempre restrito à agência do usuário.
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

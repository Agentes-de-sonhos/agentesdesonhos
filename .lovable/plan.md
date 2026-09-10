# Central de Reservas no ADS — auditoria e primeira entrega

## 1. Núcleo real (verificado no código e no banco)

Já existe e será reaproveitado sem recriar nada:

- Tabelas `travel_files`, `travel_file_services`, `travel_file_notes`, `travel_file_views`, `agency_file_counters` (numeração 7 dígitos por agência).
- RPCs `travel_files_page`, `travel_file_get`, `travel_file_service_save`, `travel_file_set_status`, `travel_file_set_responsibles`, `travel_file_note_add/delete`, com checagem `reservations.view/manage/assign/financial.manage` via `private.assert_travel_file_access` e escopo `private.agency_owner_ids()`.
- Interface: `src/components/reservas/ReservasTab.tsx` (lista, filtros, contadores, paginação de 20), `src/pages/ProcessoReserva.tsx` (ficha), `src/pages/whitelabel/admin/AgencyReservas.tsx` (painel Sites ADS), hook `src/hooks/useTravelFiles.ts`, regras em `src/lib/travelFiles.ts` e `src/lib/travelFileWorkflow.ts`.

O que falta para a Central funcionar como ficha de venda criada à mão:

1. `travel_files.root_request_id` é **NOT NULL** no banco real — hoje um file só nasce do gatilho `quote_booking_requests_ensure_file`. Sem orçamento web não existe caminho de criação.
2. Não há coluna de origem do file (web x manual), nem de contratante PJ, nem de contato responsável.
3. Não há RPC de criação manual nem tela “Nova reserva”.
4. A lista é exibida somente dentro de `/meus-projetos?tab=reservas` e em `/gestao/reservas`; não existe item “Central de Reservas” no menu principal.
5. `AgencyReservas` e a aba em Meus Projetos bloqueiam a área por `useBookingRequestCapability` (Premium + site White Label). Reservas manuais precisam ser vistas por quem tem `reservations.view`, mesmo sem site publicado.
6. Cadastro de clientes (`src/components/crm/ClientsModule.tsx`, `EditClientDialog.tsx`, `QuickAddClientDialog.tsx`) não expõe PJ, embora `companies` (nome, nome fantasia, CNPJ, e-mail, telefone) e `client_companies` (vínculo cliente↔empresa, tipo, principal) já existam com `user_id`.

## 2. Criação manual sem duplicar nada

- Um único RPC novo `travel_file_create_manual`, `SECURITY DEFINER`, exigindo `reservations.view` + `reservations.manage`, que grava **somente** em `travel_files` (+ `travel_file_services` se o usuário já informar serviços) e reserva o número por `next_agency_file_number`.
- O RPC **não** cria oportunidade, operação, carteira, orçamento, lançamento financeiro, fatura nem comissão. Nenhum gatilho novo é criado, nenhuma rotina periódica, nenhuma sincronização bidirecional.
- Cliente: a reserva aponta para um `clients.id` existente escolhido no seletor atual; criar cliente novo continua sendo função do CRM (reaproveitando `QuickAddClientDialog`). A Central nunca insere direto em `clients`.
- Vínculo com orçamento/oportunidade permanece opcional e manual (campos já existentes `quote_id`, `opportunity_id`), nunca preenchidos automaticamente.

## 3. PF/PJ com as tabelas que já existem

- `travel_files` recebe `contractor_type` (`individual` | `company`), `company_id` (referência a `companies`), `contact_client_id` (contato responsável) e `contact_snapshot` (nome/e-mail/telefone digitados quando não há cadastro).
- `client_id` continua sendo **sempre** um `clients.id`. `company_id` é uma coluna separada — nenhum id de `companies` entra em campo de cliente.
- No cadastro de clientes, um seletor “Pessoa física / Empresa” acrescenta os campos de empresa; ao salvar, a empresa vai para `companies` e o vínculo para `client_companies` (`is_primary`), sem alterar a estrutura de `clients`.
- Passageiros seguem separados do contratante: contagem em `adults_count`/`children_count` e lista em `passengers_snapshot`, que já existem.

## 4. Arquivos e migrations (aditivos)

Migration única, aditiva e idempotente:

- `ALTER TABLE public.travel_files ALTER COLUMN root_request_id DROP NOT NULL` e `ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'web_quote'`, `contractor_type text NOT NULL DEFAULT 'individual'`, `company_id uuid`, `contact_client_id uuid`, `contact_snapshot jsonb NOT NULL DEFAULT '{}'`.
- Índices por `agency_id, origin` e `agency_id, company_id`.
- `travel_file_create_manual(...)` + GRANT EXECUTE apenas para `authenticated`/`service_role`.
- Ajuste de `travel_files_page` e `travel_file_get` para devolver os novos campos e o nome da empresa (mesmas assinaturas e regras de permissão), tolerando `root_request_id` nulo — o histórico usa `quote_booking_request_events` só quando existe solicitação.

Frontend:

- Novos: `src/components/reservas/NovaReservaDialog.tsx`, `src/components/reservas/ContractorFields.tsx`, `src/hooks/useAgencyCompanies.ts`, `src/pages/CentralReservas.tsx`.
- Alterados: `ReservasTab.tsx` (botão “Nova reserva”, etiqueta de origem), `ProcessoReserva.tsx` (contratante PF/PJ, contato, ausência de orçamento de origem), `AgencyReservas.tsx` e `MeusProjetos.tsx` (liberar acesso por `reservations.view`, mantendo o aviso do site apenas para solicitações web), `App.tsx` (rota `/central-de-reservas`), `agencyAdminNav.tsx`/`agencyAdminMenu.ts` (sem duplicar entrada, preservando o prefixo `/gestao`), `AppSidebar.tsx`, `MobileSidebar.tsx`, `menuConfig.ts`, `routePermissions.ts`, `src/types/travelFile.ts`, `src/lib/travelFiles.ts`, cadastro de clientes (`ClientsModule`, `EditClientDialog`, `QuickAddClientDialog`).

Menu: **um único componente** (`ReservasTab`) usado nas três entradas — menu principal, painel Sites ADS e aba atual de Meus Projetos.

## 5. Permissões e testes

Permissões já existentes, sem chaves novas: `reservations.view` (ver), `reservations.manage` (criar/editar/etapa), `reservations.assign` (responsáveis), `reservations.financial.manage` (valor vendido/custo).

Testes (dados sintéticos, nenhum dado pessoal real):

- Criação manual sem `root_request_id` gera número sequencial da agência e status inicial correto.
- Criação manual não cria oportunidade, operação, carteira nem lançamento financeiro.
- `travel_file_create_manual` recusa usuário sem `reservations.manage` e recusa `client_id`/`company_id` de outra agência.
- `travel_files_page` de uma agência nunca devolve file de outra; membro de equipe respeita escopo e mascaramento financeiro.
- PF/PJ: empresa salva em `companies`, vínculo em `client_companies`, e nenhum id de empresa gravado em campo de cliente.
- Regressão: solicitação web continua abrindo file pelo gatilho, com protocolo e proteção de exclusão do orçamento intactos.

## 6. Status inicial

Reserva manual nasce em `request_received` (“Reserva registrada”), que já existe no conjunto validado por `travel_file_set_status`, com `financial_status = 'none'` e `operational_status = 'not_started'`. Nada indica venda confirmada nem pagamento; `confirmed_at` só é preenchido quando alguém move para `sale_confirmed`.

## 7. Riscos e retorno

- **Soltar o NOT NULL** de `root_request_id`: risco de leitura que presuma solicitação. Mitigação: revisar todos os pontos que leem `root_request_id`/`current_request_id` e tornar o histórico condicional. Retorno: as colunas novas podem ser ignoradas e a constraint recolocada após limpar files manuais.
- **Alterar RPCs existentes**: mantidas assinaturas, permissões e filtros; qualquer falha volta ao corpo anterior (versões estão nas migrations de 26/08).
- **Menu duplicado / perda de prefixo**: a entrada usa os helpers `nav.reservas()` e `agencyAdminMenu`, que já resolvem `/gestao` e SiteLab.
- **Liberação de acesso**: trocar a barreira de site publicado por `reservations.view` amplia quem vê a Central; o mascaramento financeiro do servidor continua valendo.

## 8. Fluxo para Fernando validar

1. Abrir “Central de Reservas” no menu principal e no painel do site — mesma lista.
2. “Nova reserva”: escolher pessoa física ou empresa, contato responsável, destino, datas, passageiros e valor previsto.
3. Salvar e ver “File nº 0000012 · Reserva registrada”, sem venda confirmada.
4. Conferir que CRM, financeiro, carteira e orçamentos não ganharam nenhum registro novo.
5. Abrir a ficha, definir responsáveis, acrescentar um serviço e uma anotação interna.
6. Enviar uma solicitação por orçamento web e confirmar que o fluxo antigo segue igual.

Fora desta entrega: voucher, documentos, entrega na carteira/área do cliente, financeiro vinculado e publicação.

# Central de Reservas — primeira entrega

## O que já funciona

- **Menu principal**: item "Reservas" (Central de Reservas) no desktop e no mobile, entre Gestão de Clientes e Financeiro. É a mesma lista usada no painel de Sites ADS/gestão — nenhum menu foi duplicado e os caminhos antigos continuam funcionando, inclusive com prefixo de `/gestao` e `/sitelab-base`.
- **Lista** (`/reservas`) com busca por contratante/empresa, filtro de **Rascunhos**, paginação no servidor, estados vazios explicativos e totais **separados por moeda** (BRL, USD e EUR nunca são somados juntos).
- **Nova reserva manual**: contratante Pessoa ou Empresa, contato responsável opcional, nome da viagem ou destino, datas e passageiros opcionais. Salva como **Rascunho**, com numeração de 7 dígitos da agência.
- **Ficha da reserva** (`/reservas/:id`): mostra contratante, contato responsável, origem (cadastro interno x solicitação pelo site), viagem, destino, período e passageiros; permite **Editar dados** e **Acrescentar/Editar serviços** manuais (tipo, nome, fornecedor, destino, datas, quantidade, observações; valores só com permissão financeira).
- **Empresas na área de Clientes**: nova visão "Pessoas | Empresas" reutilizando o cadastro de empresas existente. Uma empresa pode existir sozinha, só o nome é obrigatório e nenhum contato é inventado.

## Garantias importantes

- Salvar **não** confirma venda nem registra pagamento. Rascunho é um status próprio; "Solicitação recebida" continua exclusivo das solicitações vindas do site, e rascunhos não entram nos alertas de "aguardando tratamento".
- Nenhuma oportunidade, operação, orçamento, carteira ou lançamento financeiro é criado automaticamente. Reservas internas novas não aparecem para o cliente.
- Clique duplo não gera duas reservas: cada cadastro tem uma chave de intenção preservada em caso de erro.
- Todos os IDs (cliente, empresa, contato, fornecedor, responsável) são validados no servidor dentro da própria agência; valores de custo, comissão e margem são omitidos no servidor para quem não tem permissão financeira.
- O cadastro manual não depende do site White Label nem libera recursos pagos; segue as permissões e assinaturas atuais.

## Testes executados

- `src/test/central-reservas-manual.test.tsx` — 13 testes: rascunho PF, validação de contratante com formulário preservado, reserva de empresa sem misturar IDs, chave de intenção mantida no retry, cancelar sem salvar, edição de rascunho, serviço manual com e sem permissão financeira, rótulos/filtros/fluxo do rascunho.
- `src/test/central-reservas-navegacao-empresas.test.tsx` — 5 testes: item único no menu entre clientes e financeiro, permissão da rota, empresas com estado vazio, cadastro só com nome, ocultação de ações sem permissão.
- Regressão: `travel-files`, `travel-file-workflow`, `crm-toolbar-layout`, `crm-new-client-command`, `agency-admin-menu-order` — 47 testes.
- `npx tsgo --noEmit -p tsconfig.app.json` sem erros e build OK.

## Limitações desta etapa

- A rejeição entre agências e a omissão de valores acontecem nas funções do banco; foram validadas por revisão do SQL, não por teste automatizado com banco real (nenhum dado de cliente real foi usado).
- Voucher próprio, documentos, vínculo com financeiro/oportunidades/operações e entrega na Área do Cliente ficam para fases seguintes.
- Nada foi publicado.

## Como o Fernando pode validar

1. Abrir **Reservas** no menu principal.
2. Clicar em **Nova reserva**, escolher Pessoa, selecionar um contratante, digitar o nome da viagem e salvar.
3. Conferir que a reserva aparece como **Rascunho** com número e abre a ficha.
4. Na ficha, usar **Editar dados** e **Acrescentar serviço**; conferir que o histórico registra as alterações.
5. Repetir criando uma reserva de **Empresa**, cadastrando a empresa na hora.
6. Em **Clientes**, alternar para **Empresas** e conferir busca, cadastro e edição.
7. Conferir que orçamentos, oportunidades, operações, financeiro e carteiras seguem inalterados.

## Revisão independente — correções aplicadas (10/09)

Migrations aplicadas nesta rodada (sem duplicar reservas nem recursos):
`20260910134125_*.sql` (correções) e `20260910134156_*.sql` (permissão de uso das funções internas).

1. Responsável da reserva validado por `agency_team_members.agency_id` + vínculo `active`
   (a coluna `agency_owner_id` não existe); `reservations.assign` continua exigida.
2. Serviços de reserva vinda do site não podem ser criados **nem editados** pela Central.
3. Regras de etapa restauradas conforme o comportamento antigo (bloqueio de volta para
   "Solicitação recebida" após a venda, `confirmed_at` em todas as etapas vendidas,
   `completed_at` preservado no cancelamento). "Rascunho" foi somado sem mudar o resto.
4. Fornecedor aceito só se for do catálogo global aprovado ou da própria agência
   (`owner_agency_id`/`user_id`), não mais um `EXISTS` simples.
5. Busca de empresas: parte numérica só é usada quando existe; texto sem números não
   retorna mais todas as empresas e as letras seguem comparadas em nome e nome fantasia.
6. Servidor valida intervalo de datas, moeda (BRL/USD/EUR), quantidades inteiras e valores
   finitos/não negativos. Rascunho pode ficar sem passageiro (não inventa adulto).
   Histórico interno passou a registrar tipo, quantidade, moeda, fornecedor, datas,
   observações/snapshot e alterações de valores.
7. Sanitização financeira recursiva (`private.reservations_redact`) aplicada ao file, aos
   serviços com snapshot e aos dois históricos, cobrindo as chaves legadas
   `sold_from/to`, `cost_from/to`, `commission_from/to`, `reconfirmed_from/to`.
8. Leitura direta (bypass de RPC) das linhas **manuais**, dos seus serviços e da nova
   `travel_file_events` restrita a quem tem receita + margem + comissão (ou admin), via
   policies RESTRICTIVE. As linhas antigas (origem web) seguem legíveis como hoje para
   não quebrar o frontend já publicado.
9. Policies amplas `companies_agency_members_full_access` e
   `client_companies_agency_members_full_access` removidas e substituídas por policies
   por operação que preservam o proprietário e passam a exigir `clients.view/create/edit/delete`.
10. Nenhuma operação, carteira, orçamento ou lançamento financeiro é criado direta ou
    indiretamente; apenas `travel_files` manuais e seus serviços/eventos.

### Pendências reais (não resolvidas nesta rodada)
- **Endurecimento dos dados legados (origem web)**: a leitura direta dessas linhas continua
  liberada para `reservations.view` porque o frontend publicado depende disso. O endurecimento
  precisa de deploy coordenado (novo frontend por RPC + policy restritiva também para
  `origin = 'web_quote'`). **O problema legado NÃO está eliminado.**
- Validação visual autenticada (navegador, agência real) ainda não foi feita.
- Rejeição cross-agência e redaction foram verificadas por contrato de SQL e catálogo do banco;
  não houve execução autenticada em banco com usuários reais (proibido nesta fase).

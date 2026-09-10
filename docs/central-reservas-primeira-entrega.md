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

## Continuação da mesma entrega (correções de comportamento)

1. **Busca isolada por identidade** — a busca de pessoas no cadastro manual passou a
   guardar o resultado por usuário; trocar de conta na mesma aba não reaproveita nada
   do que foi carregado antes.
2. **Escolha sempre visível** — pessoa, empresa e contato responsável guardam o registro
   escolhido (não apenas o identificador). Depois de escolher, o nome continua na tela
   mesmo digitando outra busca, e nunca é enviado um contratante invisível.
3. **Situação do serviço preservada** — editar nome, datas, quantidade ou observações de um
   serviço já reservado/emitido mantém a situação atual; "solicitado" só é usado na criação.
4. **Observação pode ser apagada** — esvaziar o campo de observação agora apaga a anterior,
   em vez de manter o texto antigo.
5. **Elegibilidade real** — o acesso à Central segue Premium, Fundador ou Promoção Grupo SC
   dentro da validade. Colaborador ativo não tem mais passe livre: ele herda o plano da conta
   master. Administrador, promotor e liberação individual continuam com acesso.

### Resultado das verificações
- 14 testes do cadastro manual/serviços e 28 testes das correções de banco passaram.
- Verificação de tipos e build do projeto passaram.
- O relatório de segurança do banco continua com os mesmos 460 avisos gerais anteriores
  (nenhum novo foi introduzido por esta rodada).
- Continua pendente a validação visual autenticada em navegador e o endurecimento dos
  dados legados de origem web (precisa de deploy coordenado). Nada foi publicado.

## Fechamento da mesma entrega (revisão final)

1. **Editar não apaga mais nada** — a edição envia apenas os campos que a tela mudou e a
   função do banco preserva o que não foi enviado. Uma reserva em dólar ou euro com contato
   escrito à mão continua igual depois de mudar só o destino; limpar um dado continua
   possível quando o usuário pede explicitamente.
2. **Voltar** — o botão volta sempre para a lista de Reservas do contexto atual
   (`/reservas`, `/gestao/reservas` e a mesma rota dentro do Site Lab). Ninguém cai mais em
   uma aba de projetos protegida por outro plano.
3. **Ficha e notas por conta** — os dados da ficha e as notas internas passaram a ser
   guardados por identidade; trocar de conta na mesma aba não reaproveita valores ou
   permissões de quem estava antes.
4. **Falha de busca aparece como falha** — quando a busca de pessoas ou empresas não
   responde, a tela mostra o aviso com "Tentar novamente" e preserva o formulário, em vez de
   dizer que nada foi encontrado (o que levava a cadastrar de novo).
5. **Valor à brasileira** — o valor do serviço aceita `1.500,00`, `1500,50`, `R$ 1.500,00` e
   `1500.50`; texto inválido é recusado com aviso, nunca convertido em silêncio.

### O que foi realmente comprovado nesta rodada
- **Testes de componentes/hooks (executados)**: 8 testes novos, incluindo o pacote real
  enviado pelo hook na edição (sem moeda, valor ou contato), os formatos de valor aceitos e
  recusados, e o caminho da lista de Reservas na plataforma tradicional.
- **Testes já existentes (executados)**: 14 do cadastro manual/serviços, 5 de empresas e
  navegação, 28 de contrato de banco. Verificação de tipos e build passaram.
- **Revisão de SQL (estática)**: a semântica de atualização parcial foi revisada linha a
  linha na função aplicada; não houve execução autenticada em banco com usuários reais.
- **Não comprovado**: validação visual autenticada em navegador e execução real de
  isolamento/redaction com contas de agências diferentes.
- **Continua pendente**: o endurecimento dos dados legados de origem web depende de deploy
  coordenado, portanto o isolamento financeiro dos registros antigos **não** está completo.
- Os avisos gerais do relatório de segurança do banco permanecem os mesmos (460), sem novos
  avisos introduzidos. Nada foi publicado.

## Últimos ajustes funcionais (mesma entrega)

- Em RASCUNHO manual, a edição permite corrigir o contratante (pessoa ou empresa)
  e adicionar/trocar o contato responsável PJ depois de salvo. O seletor foi
  extraído para `src/components/reservas/ContractorPicker.tsx` e é o mesmo usado
  no cadastro — sem duplicar a lógica do `NovaReservaDialog`. `client_id` e
  `company_id` continuam separados: o lado não usado vai nulo. Fora de rascunho
  (inclusive reservas vindas do site) o seletor não aparece e os vínculos
  originais são reenviados sem alteração. Permissões seguem `reservations.manage`
  e a busca continua limitada pela RLS da própria agência.
- Na área de Clientes, a ação principal segue a visão selecionada: "Nova pessoa"
  abre o cadastro PF de sempre e "Nova empresa" abre o cadastro de empresas já
  existente no painel, sem duas ações incoerentes. Atalhos e fluxos antigos de PF
  permanecem inalterados fora da visão Empresas.
- Testes focados: `src/test/central-reservas-rascunho-contratante.test.tsx`
  (correção PF, troca PF→PJ com contato, validação de empresa obrigatória e caso
  sem permissão de correção). Regressões da Central, tipos e build passaram.
  Continua sem validação visual autenticada real.

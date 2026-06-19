# Índice de chunks RAG

Geração inicial em 2026-06-18.

## Convenções
- Cada chunk corresponde a um artigo independente da Central de Ajuda.
- ID estável serve como chave nos relacionamentos entre artigos.
- Apenas chunks com confiança `confirmado` e status `pronto` entram em `BASE-RAG.jsonl`.

## Tipos de chunks
- Visão geral por módulo
- Primeiros passos por módulo
- FAQ canônica (módulos principais selecionados)

## Estatísticas
- Chunks confirmados publicados nesta etapa: visão + primeiros passos dos 35 módulos + 80 FAQs canônicas validadas.
- Chunks em revisão (não exportados ao RAG público): 190 FAQs iniciais de módulos secundários.

## Próximos ciclos
- Completar FAQs canônicas dos demais módulos principais.
- Adicionar chunks de tutoriais, problemas comuns e boas práticas.

## Atualização Onda 1 (2026-06-18)
- Módulo aprofundado: CRM e Oportunidades.
- Novos chunks confirmados publicados: 37 (20 FAQs adicionais, 8 tutoriais, 5 problemas comuns, 4 boas práticas).
- Total atual no BASE-RAG.jsonl: 187 chunks.
- Demais módulos da Onda 1 (Gestão de Clientes, Operações, Orçamentos, Carteira Digital, Roteiros, Financeiro Visão Geral, Vendas, Comissões e Vendedores, Equipe e Permissões): apenas mapa de produção criado. Nenhum chunk novo publicado, conforme política de "não inventar".


## Subonda 1B — Gestão de Clientes e Operações (2026-06-18)

Adicionados 74 chunks confirmados.

### Gestão de Clientes
- `clientes-faq-01` — Onde fica a lista de clientes (faq)
- `clientes-faq-02` — Como cadastrar um novo cliente (faq)
- `clientes-faq-03` — Campos obrigatórios para criar cliente (faq)
- `clientes-faq-04` — Editar dados de um cliente (faq)
- `clientes-faq-05` — Como localizar um cliente (faq)
- `clientes-faq-06` — Filtro por status de cliente (faq)
- `clientes-faq-07` — Várias viagens para o mesmo cliente (faq)
- `clientes-faq-08` — Diferença entre cliente e passageiro (faq)
- `clientes-faq-09` — Adicionar observações internas (faq)
- `clientes-faq-10` — Cadastrar preferências de viagem (faq)
- `clientes-faq-11` — Data de aniversário do cliente (faq)
- `clientes-faq-12` — Importar lista de contatos (faq)
- `clientes-faq-13` — Formatos aceitos na importação (faq)
- `clientes-faq-14` — Cadastro rápido pelo funil (faq)
- `clientes-faq-15` — Cliente obrigatório em outros módulos (faq)
- `clientes-faq-16` — Status Cliente indicada (faq)
- `clientes-faq-17` — Vincular cliente a oportunidade (faq)
- `clientes-faq-18` — Métricas dos clientes (faq)
- `clientes-faq-19` — Aba de metas comerciais (faq)
- `clientes-faq-20` — Permissões da equipe em clientes (faq)
- `clientes-tut-01` — Cadastrar um novo cliente (tutorial)
- `clientes-tut-02` — Editar dados de um cliente (tutorial)
- `clientes-tut-03` — Buscar e filtrar clientes (tutorial)
- `clientes-tut-04` — Cadastro rápido Novo Contato (tutorial)
- `clientes-tut-05` — Registrar preferências e observações (tutorial)
- `clientes-tut-06` — Importar contatos (tutorial)
- `clientes-tut-07` — Vincular cliente a oportunidade (tutorial)
- `clientes-tut-08` — Adicionar viagem ao cliente (tutorial)
- `clientes-prob-01` — Cliente não aparece na busca (problema-comum)
- `clientes-prob-02` — Cliente não aparece em outro módulo (problema-comum)
- `clientes-prob-03` — Cadastro duplicado (problema-comum)
- `clientes-prob-04` — Membro da equipe não vê clientes (problema-comum)
- `clientes-prob-05` — Erro ao importar planilha (problema-comum)
- `clientes-bp-01` — Padronize cadastro mínimo (boas-praticas)
- `clientes-bp-02` — Evite duplicidades (boas-praticas)
- `clientes-bp-03` — Cliente vs passageiro (boas-praticas)
- `clientes-bp-04` — Registre preferências cedo (boas-praticas)

### Operações
- `operacoes-faq-01` — Onde fica Operações (faq)
- `operacoes-faq-02` — O que é uma operação (faq)
- `operacoes-faq-03` — Diferença oportunidade venda operação (faq)
- `operacoes-faq-04` — Como criar uma nova operação (faq)
- `operacoes-faq-05` — Colunas do quadro (faq)
- `operacoes-faq-06` — Mover operação entre etapas (faq)
- `operacoes-faq-07` — Buscar uma operação (faq)
- `operacoes-faq-08` — Adicionar tarefa à operação (faq)
- `operacoes-faq-09` — Checklist por etapa (faq)
- `operacoes-faq-10` — Anexar arquivos à operação (faq)
- `operacoes-faq-11` — Registrar notas (faq)
- `operacoes-faq-12` — Ver histórico da operação (faq)
- `operacoes-faq-13` — Etiquetas na operação (faq)
- `operacoes-faq-14` — Compartilhar link da operação (faq)
- `operacoes-faq-15` — Atualizar dados da operação (faq)
- `operacoes-faq-16` — Remover uma operação (faq)
- `operacoes-faq-17` — Informações no card (faq)
- `operacoes-faq-18` — Criar nova coluna (faq)
- `operacoes-faq-19` — Relação com Carteira e roteiro (faq)
- `operacoes-faq-20` — Tarefas pendentes hoje (faq)
- `operacoes-tut-01` — Criar uma nova operação (tutorial)
- `operacoes-tut-02` — Localizar uma operação (tutorial)
- `operacoes-tut-03` — Mover operação entre etapas (tutorial)
- `operacoes-tut-04` — Criar nova coluna no quadro (tutorial)
- `operacoes-tut-05` — Adicionar tarefas (tutorial)
- `operacoes-tut-06` — Registrar uma nota (tutorial)
- `operacoes-tut-07` — Salvar checklist como padrão (tutorial)
- `operacoes-tut-08` — Encerrar uma operação (tutorial)
- `operacoes-prob-01` — Operação criada não aparece (problema-comum)
- `operacoes-prob-02` — Não consigo mover operação (problema-comum)
- `operacoes-prob-03` — Falta de tarefas impede salvar (problema-comum)
- `operacoes-prob-04` — Modelo de checklist não aplica (problema-comum)
- `operacoes-prob-05` — Não foi possível restaurar (problema-comum)
- `operacoes-bp-01` — Padronize o pipeline (boas-praticas)
- `operacoes-bp-02` — Use checklists padrão (boas-praticas)
- `operacoes-bp-03` — Prazos claros nas tarefas (boas-praticas)
- `operacoes-bp-04` — Separe operacional do financeiro (boas-praticas)


## Subonda 1C — Orçamentos e Carteira Digital (2026-06-19)

Adicionados 73 chunks confirmados nesta subonda (37 em Carteira Digital + 36 em Orçamentos).

> **Correção pós-entrega (2026-06-19):** o chunk `orcamentos-faq-19` ("Como acompanhar visualizações do orçamento?") foi **removido do RAG** porque a própria resposta declara que as métricas estão pendentes de confirmação. O artigo foi rebaixado para `status: revisão-necessária` e `confianca: pendente` e passa a constar em `07-PERGUNTAS-PENDENTES-DE-VALIDACAO.md`. Por isso a Subonda 1C contribuiu líquidos **73** chunks confirmados (não 74) e o módulo Orçamentos passou a ter **19** FAQs confirmadas (em vez de 20).

### Orçamentos
- `orcamentos-faq-21` a `orcamentos-faq-40` (20 novas FAQs confirmadas)
- `orcamentos-tut-01` a `orcamentos-tut-08` (8 tutoriais)
- `orcamentos-prob-01` a `orcamentos-prob-05` (5 problemas comuns)
- `orcamentos-bp-01` a `orcamentos-bp-04` (4 boas práticas)
- **Excluído do RAG:** `orcamentos-faq-19` (rebaixado a `revisão-necessária / pendente`).

### Carteira Digital
- `carteira-digital-faq-21` a `carteira-digital-faq-40` (20 novas FAQs)
- `carteira-digital-tut-01` a `carteira-digital-tut-08` (8 tutoriais)
- `carteira-digital-prob-01` a `carteira-digital-prob-05` (5 problemas comuns)
- `carteira-digital-bp-01` a `carteira-digital-bp-04` (4 boas práticas)

Total atual no BASE-RAG.jsonl: **334 chunks**.


## Subonda 1D (2026-06-19)

### Roteiros
- rt-faq-21 — Onde encontro o módulo Roteiros?
- rt-faq-22 — Como crio um roteiro novo?
- rt-faq-23 — Preciso vincular um cliente ao roteiro?
- rt-faq-24 — Como adiciono dias ao roteiro?
- rt-faq-25 — Como adiciono atividades em um dia?
- rt-faq-26 — Quais períodos do dia o roteiro suporta?
- rt-faq-27 — Como uso a IA para gerar o roteiro?
- rt-faq-28 — Posso editar o roteiro gerado pela IA?
- rt-faq-29 — Como reordeno as atividades de um dia?
- rt-faq-30 — Como adiciono uma foto à atividade?
- rt-faq-31 — Existe limite diário de roteiros gerados por IA?
- rt-faq-32 — Como compartilho um roteiro com o cliente?
- rt-faq-33 — Qual é o domínio do link público do roteiro?
- rt-faq-34 — Como vinculo o roteiro a uma Carteira Digital?
- rt-faq-35 — Onde encontro os modelos de roteiro?
- rt-faq-36 — Como clono um modelo de roteiro?
- rt-faq-37 — Posso editar a descrição do destino do roteiro?
- rt-faq-38 — Como gero o PDF do roteiro?
- rt-faq-39 — O roteiro é salvo automaticamente?
- rt-faq-40 — Quem pode editar um roteiro?
- rt-tut-01 — Criar um roteiro do zero
- rt-tut-02 — Gerar um roteiro com IA
- rt-tut-03 — Adicionar e editar atividades em um dia
- rt-tut-04 — Reordenar atividades dentro de um período
- rt-tut-05 — Adicionar foto a uma atividade
- rt-tut-06 — Usar um modelo de roteiro como ponto de partida
- rt-tut-07 — Compartilhar o link público do roteiro
- rt-tut-08 — Vincular o roteiro a uma Carteira Digital
- rt-prob-01 — Limite diário de roteiros por IA atingido
- rt-prob-02 — Erro ao carregar roteiro existente
- rt-prob-03 — Falha ao vincular roteiro à Carteira Digital
- rt-prob-04 — Erro ao gerar PDF do roteiro
- rt-prob-05 — Alterações no roteiro não aparecem no link público
- rt-bp-01 — Sempre revise o roteiro gerado por IA antes de enviar
- rt-bp-02 — Padronize a granularidade das atividades
- rt-bp-03 — Use imagens com direito de uso
- rt-bp-04 — Confirme a versão pública do roteiro antes de orientar o cliente

### Financeiro — Visão Geral
- fin-faq-21 — Onde fica o módulo Financeiro?
- fin-faq-22 — Quais abas existem dentro do Financeiro?
- fin-faq-23 — Qual é a diferença entre Visão Geral e as outras abas?
- fin-faq-24 — Como filtro por mês no dashboard?
- fin-faq-25 — O que é uma venda no Financeiro?
- fin-faq-26 — O que é uma entrada?
- fin-faq-27 — O que é uma despesa?
- fin-faq-28 — O que é uma fatura?
- fin-faq-29 — Como é calculado o lucro líquido?
- fin-faq-30 — Comissão de vendedor é despesa?
- fin-faq-31 — Como exportar a Visão Geral?
- fin-faq-32 — Por que o dashboard está vazio?
- fin-faq-33 — Os números do dashboard incluem orçamentos não fechados?
- fin-faq-34 — Quais perfis acessam o Financeiro?
- fin-faq-35 — Como vejo a relação entre uma venda e a comissão gerada?
- fin-faq-36 — Onde acompanho contas a receber?
- fin-faq-37 — Onde acompanho contas a pagar?
- fin-faq-38 — Posso excluir um registro financeiro?
- fin-faq-39 — O Financeiro funciona em qualquer plano?
- fin-faq-40 — Como reportar uma divergência no dashboard?
- fin-tut-01 — Acessar o módulo Financeiro
- fin-tut-02 — Filtrar o dashboard por período
- fin-tut-03 — Interpretar os principais indicadores
- fin-tut-04 — Navegar entre as abas do Financeiro
- fin-tut-05 — Exportar uma tabela do Financeiro
- fin-tut-06 — Localizar uma venda específica
- fin-tut-07 — Conferir a comissão gerada por uma venda
- fin-tut-08 — Acompanhar o mês usando a Visão Geral
- fin-prob-01 — Dashboard aparece zerado
- fin-prob-02 — Números divergentes entre Visão Geral e Vendas
- fin-prob-03 — Exportação gera arquivo vazio
- fin-prob-04 — Comissão aparece sem venda relacionada
- fin-prob-05 — Não consigo acessar o Financeiro
- fin-bp-01 — Padronize o uso de períodos
- fin-bp-02 — Concilie comissões e despesas mensalmente
- fin-bp-03 — Evite excluir registros sem checar dependências
- fin-bp-04 — Use a Visão Geral como leitura executiva


## Subonda 1E (2026-06-19)

### Vendas
- vd-faq-01 — Onde fica o módulo Vendas?
- vd-faq-02 — Como inicio uma nova venda?
- vd-faq-03 — O cliente é obrigatório ao registrar uma venda?
- vd-faq-04 — Posso criar uma venda a partir de uma oportunidade do CRM?
- vd-faq-05 — Qual a diferença entre orçamento, oportunidade e venda?
- vd-faq-06 — Como adiciono um produto ou serviço à venda?
- vd-faq-07 — Posso registrar mais de um produto na mesma venda?
- vd-faq-08 — Como vinculo um vendedor à venda?
- vd-faq-09 — Vendedor é obrigatório?
- vd-faq-10 — Como configuro a comissão da agência por produto?
- vd-faq-11 — O que são taxas não comissionáveis?
- vd-faq-12 — Como defino a regra de pagamento de um produto?
- vd-faq-13 — Posso usar uma data manual de recebimento da comissão?
- vd-faq-14 — Como salvo uma venda em rascunho?
- vd-faq-15 — Como edito uma venda já registrada?
- vd-faq-16 — Como excluo uma venda?
- vd-faq-17 — O que acontece com a comissão se eu alterar o valor da venda?
- vd-faq-18 — Como filtro as vendas por mês?
- vd-faq-19 — Como exporto a lista de vendas?
- vd-faq-20 — Quais perfis podem registrar vendas?
- vd-tut-01 — Registrar uma venda do zero
- vd-tut-02 — Importar uma venda a partir de uma oportunidade do CRM
- vd-tut-03 — Adicionar vários produtos à mesma venda
- vd-tut-04 — Definir comissão por percentual ou valor fixo
- vd-tut-05 — Vincular um vendedor e ajustar a comissão de vendedor
- vd-tut-06 — Editar uma venda existente
- vd-tut-07 — Excluir uma venda com segurança
- vd-tut-08 — Filtrar vendas por mês
- vd-tut-09 — Exportar vendas em XLSX ou PDF
- vd-tut-10 — Conferir a venda antes de salvar
- vd-prob-01 — A venda não é salva ao clicar em Salvar
- vd-prob-02 — O cliente desejado não aparece no seletor
- vd-prob-03 — O fornecedor não aparece no seletor de produtos
- vd-prob-04 — O valor total da venda não corresponde à soma dos produtos
- vd-prob-05 — A comissão do vendedor não virou despesa
- vd-bp-01 — Sempre registre a venda somente após a confirmação comercial
- vd-bp-02 — Detalhe cada produto da venda separadamente
- vd-bp-03 — Separe sempre as taxas não comissionáveis
- vd-bp-04 — Revise vínculos antes de excluir uma venda

### Comissões e Vendedores
- cv-faq-01 — Onde cadastro um vendedor?
- cv-faq-02 — Vendedor precisa ter login na plataforma?
- cv-faq-03 — Qual a diferença entre vendedor e usuário da equipe?
- cv-faq-04 — Como defino a comissão padrão de um vendedor?
- cv-faq-05 — Posso alterar a comissão de um vendedor a qualquer momento?
- cv-faq-06 — Como vinculo um vendedor a uma venda?
- cv-faq-07 — Posso desativar um vendedor?
- cv-faq-08 — Vendedor inativo continua aparecendo nas vendas antigas?
- cv-faq-09 — O que é comissão da agência?
- cv-faq-10 — O que é comissão de vendedor?
- cv-faq-11 — Comissão da agência e comissão do vendedor são a mesma coisa?
- cv-faq-12 — Onde acompanho as comissões a receber?
- cv-faq-13 — Quais subabas existem dentro de Comissões?
- cv-faq-14 — Como funciona a data esperada da comissão?
- cv-faq-15 — O que significa comissão atrasada?
- cv-faq-16 — Como marco uma comissão como recebida?
- cv-faq-17 — Comissão exige nota fiscal?
- cv-faq-18 — O que é o Ranking de Fornecedores?
- cv-faq-19 — Como filtro comissões por vendedor ou por fornecedor?
- cv-faq-20 — Quem pode editar vendedores e comissões?
- cv-tut-01 — Cadastrar um vendedor
- cv-tut-02 — Editar o percentual padrão de um vendedor
- cv-tut-03 — Desativar um vendedor
- cv-tut-04 — Vincular um vendedor a uma venda nova
- cv-tut-05 — Consultar a Central de Comissões
- cv-tut-06 — Filtrar comissões por mês
- cv-tut-07 — Acompanhar comissões atrasadas
- cv-tut-08 — Acompanhar notas fiscais relacionadas a comissões
- cv-tut-09 — Consultar o ranking de fornecedores
- cv-tut-10 — Conferir comissão de vendedor após registrar a venda
- cv-prob-01 — O vendedor não aparece no seletor de Nova Venda
- cv-prob-02 — A comissão da agência está com valor diferente do esperado
- cv-prob-03 — A comissão do vendedor não virou despesa
- cv-prob-04 — Comissão aparece como atrasada mesmo após o recebimento
- cv-prob-05 — Não consigo editar um vendedor
- cv-bp-01 — Cadastre todos os vendedores antes de iniciar a operação do mês
- cv-bp-02 — Padronize o percentual padrão por perfil de vendedor
- cv-bp-03 — Acompanhe comissões atrasadas semanalmente
- cv-bp-04 — Concilie comissão da agência e comissão de vendedor mensalmente

Total atual no BASE-RAG.jsonl: **486 chunks**.

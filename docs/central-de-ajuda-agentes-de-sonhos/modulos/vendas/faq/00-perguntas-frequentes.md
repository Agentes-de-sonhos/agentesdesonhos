# Perguntas frequentes — Vendas

Perguntas canônicas validadas com base na Base de Conhecimento Mestre e na interface atual.

## Onde fica o módulo Vendas?

**Pergunta:** Onde fica o módulo Vendas?

**O que o usuário pode perguntar:**
- onde fica vendas
- como acessar vendas

**Resposta direta:** No menu **Financeiro**, abra a aba **Vendas** (caminho `/financeiro?tab=sales`). Essa é a tela onde todas as vendas registradas são listadas e novas vendas podem ser iniciadas.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-01`

---
## Como inicio uma nova venda?

**Pergunta:** Como inicio uma nova venda?

**O que o usuário pode perguntar:**
- criar venda
- nova venda
- registrar venda

**Resposta direta:** Em **Financeiro → Vendas**, clique em **Nova Venda**. Um assistente (wizard) com etapas Origem, Cliente, Destino, Data, Produtos e Revisão será aberto para você preencher os dados antes de salvar.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-02`

---
## O cliente é obrigatório ao registrar uma venda?

**Pergunta:** O cliente é obrigatório ao registrar uma venda?

**O que o usuário pode perguntar:**
- cliente obrigatório venda
- preciso de cliente

**Resposta direta:** Sim. O wizard de Nova Venda exige um cliente vinculado por meio do **ClientSelector** antes de avançar para os produtos. Cadastre o cliente em **CRM → Clientes** se ele ainda não existir.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-03`

---
## Posso criar uma venda a partir de uma oportunidade do CRM?

**Pergunta:** Posso criar uma venda a partir de uma oportunidade do CRM?

**O que o usuário pode perguntar:**
- importar oportunidade
- venda a partir do crm

**Resposta direta:** Sim. Na etapa **Origem** do wizard escolha **A partir do CRM**, selecione a oportunidade fechada e confirme a importação. O sistema preenche cliente e destino com base na oportunidade selecionada.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-04`

---
## Qual a diferença entre orçamento, oportunidade e venda?

**Pergunta:** Qual a diferença entre orçamento, oportunidade e venda?

**O que o usuário pode perguntar:**
- diferença orçamento venda
- oportunidade vs venda

**Resposta direta:** **Oportunidade** é uma negociação em andamento no CRM. **Orçamento** é a proposta comercial enviada ao cliente. **Venda** é o registro financeiro da operação confirmada, com produtos, valores e comissões. Cada etapa é registrada em módulos diferentes.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-05`

---
## Como adiciono um produto ou serviço à venda?

**Pergunta:** Como adiciono um produto ou serviço à venda?

**O que o usuário pode perguntar:**
- adicionar produto venda
- incluir serviço venda

**Resposta direta:** Na etapa **Produtos** do wizard, clique em **Adicionar produto** e preencha tipo (aéreo, hotel, transfer, locação, atração, outro), descrição, valor de venda, custo, taxas não comissionáveis, fornecedor e regras de comissão.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-06`

---
## Posso registrar mais de um produto na mesma venda?

**Pergunta:** Posso registrar mais de um produto na mesma venda?

**O que o usuário pode perguntar:**
- vários produtos venda
- múltiplos serviços

**Resposta direta:** Sim. A mesma venda pode conter vários produtos/serviços. Cada um tem seu próprio fornecedor, valor, comissão e regra de pagamento. O total da venda é a soma dos preços de venda dos produtos.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-07`

---
## Como vinculo um vendedor à venda?

**Pergunta:** Como vinculo um vendedor à venda?

**O que o usuário pode perguntar:**
- associar vendedor
- vendedor responsável

**Resposta direta:** Na revisão da venda, selecione o vendedor responsável no campo **Vendedor**. A comissão padrão cadastrada para esse vendedor é sugerida e pode ser ajustada antes de salvar.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-08`

---
## Vendedor é obrigatório?

**Pergunta:** Vendedor é obrigatório?

**O que o usuário pode perguntar:**
- vendedor obrigatório

**Resposta direta:** Não é obrigatório registrar a venda, mas é necessário para que a comissão de vendedor seja gerada automaticamente como despesa. Quando não houver vendedor, a despesa de comissão de vendedor não é criada.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-09`

---
## Como configuro a comissão da agência por produto?

**Pergunta:** Como configuro a comissão da agência por produto?

**O que o usuário pode perguntar:**
- comissão agência
- percentual comissão

**Resposta direta:** Em cada produto da venda há os campos **Tipo de comissão** (percentual ou valor fixo) e **Valor da comissão**. Quando percentual, a base de cálculo é o **valor de venda menos as taxas não comissionáveis**.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-10`

---
## O que são taxas não comissionáveis?

**Pergunta:** O que são taxas não comissionáveis?

**O que o usuário pode perguntar:**
- taxa não comissionável
- taxas que não geram comissão

**Resposta direta:** São valores embutidos no preço de venda que **não entram na base de cálculo da comissão**, como taxas de embarque ou taxas governamentais. Preencha-as no campo **Taxas não comissionáveis** de cada produto.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-11`

---
## Como defino a regra de pagamento de um produto?

**Pergunta:** Como defino a regra de pagamento de um produto?

**O que o usuário pode perguntar:**
- regra de pagamento
- data esperada comissão

**Resposta direta:** Cada produto tem uma **regra de pagamento** (ex.: após a venda, após o embarque) e um número de **dias** que o sistema usa para calcular a **data esperada** de recebimento da comissão da agência.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-12`

---
## Posso usar uma data manual de recebimento da comissão?

**Pergunta:** Posso usar uma data manual de recebimento da comissão?

**O que o usuário pode perguntar:**
- data manual
- data fixa comissão

**Resposta direta:** Sim. Quando a regra padrão não se aplica, preencha uma **data específica** no produto. Essa data substitui o cálculo automático para aquele item.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-13`

---
## Como salvo uma venda em rascunho?

**Pergunta:** Como salvo uma venda em rascunho?

**O que o usuário pode perguntar:**
- salvar rascunho venda

**Resposta direta:** O wizard mantém os dados em estado intermediário enquanto você navega entre as etapas. A venda só é persistida ao concluir a etapa **Revisão** e clicar em **Salvar**. Não há salvamento automático em servidor durante o wizard.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-14`

---
## Como edito uma venda já registrada?

**Pergunta:** Como edito uma venda já registrada?

**O que o usuário pode perguntar:**
- editar venda
- alterar venda

**Resposta direta:** Na lista de vendas, clique no ícone de **editar** ao lado da venda desejada. Você pode alterar campos da venda principal, e também adicionar, editar ou remover produtos individuais pela linha expandida.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-15`

---
## Como excluo uma venda?

**Pergunta:** Como excluo uma venda?

**O que o usuário pode perguntar:**
- excluir venda
- apagar venda

**Resposta direta:** Use o ícone de **lixeira** na lista de vendas. O sistema pede confirmação. A exclusão pode afetar registros financeiros relacionados (entradas, comissões, despesas de comissão). Revise as dependências antes de confirmar.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-16`

---
## O que acontece com a comissão se eu alterar o valor da venda?

**Pergunta:** O que acontece com a comissão se eu alterar o valor da venda?

**O que o usuário pode perguntar:**
- recálculo comissão
- valor venda mudou

**Resposta direta:** Ao salvar a venda com novo valor, as comissões dos produtos são recalculadas conforme a configuração de cada um (percentual ou fixo). A despesa de comissão de vendedor é ressincronizada automaticamente.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-17`

---
## Como filtro as vendas por mês?

**Pergunta:** Como filtro as vendas por mês?

**O que o usuário pode perguntar:**
- filtro mês vendas
- ver vendas do mês

**Resposta direta:** Use o seletor de mês no topo do Financeiro. A lista de vendas passa a exibir apenas os registros cuja **data da venda** está no mês selecionado.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-18`

---
## Como exporto a lista de vendas?

**Pergunta:** Como exporto a lista de vendas?

**O que o usuário pode perguntar:**
- exportar vendas
- baixar vendas

**Resposta direta:** No topo da lista de vendas há o botão **Exportar**. Escolha o formato (XLSX ou PDF). A exportação respeita os filtros ativos na tela.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-19`

---
## Quais perfis podem registrar vendas?

**Pergunta:** Quais perfis podem registrar vendas?

**O que o usuário pode perguntar:**
- quem pode registrar venda
- permissão vendas

**Resposta direta:** Titular da agência e usuários com permissão de Financeiro podem registrar, editar e excluir vendas. As permissões granulares são configuradas em **Equipe e Permissões**.

**Pré-requisitos:** Ter acesso ao módulo Vendas com permissão suficiente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `vd-faq-20`

---

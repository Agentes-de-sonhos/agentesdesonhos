# Perguntas frequentes — Gestão de Clientes

> Conjunto canônico de 20 perguntas confirmadas a partir da Base de Conhecimento Mestre e da inspeção da interface em `/gestao-clientes`. Conteúdos pendentes estão sinalizados em `09-LACUNAS-INCONSISTENCIAS-E-PERGUNTAS.md` da Base Mestre.

---
id: clientes-faq-01
titulo: Onde fica a lista de clientes na plataforma?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: acesso ao módulo Gestão de Clientes
intencoes: [acessar lista de clientes, encontrar clientes, abrir cadastro]
palavras-chave: [clientes, lista, onde encontrar, gestao-clientes]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-02, gestao-clientes-visao-geral]
fonte-interna: src/pages/GestaoClientes.tsx
---

# Onde fica a lista de clientes na plataforma?

## Resposta direta
No menu principal, abra **Gestão de Clientes** e selecione a aba **Clientes**. A URL é `/gestao-clientes` e a aba interna se chama exatamente **Clientes**.

## Como fazer
1. No menu lateral, clique em **Gestão de Clientes**.
2. Na barra superior do módulo, selecione a aba **Clientes**.
3. A lista exibe todos os clientes cadastrados na sua conta.

## Resultado esperado
A grade ou tabela de clientes aparece com nome, contato e ações rápidas.

## Outras formas de perguntar
- Como vejo todos os meus clientes?
- Onde está o cadastro de clientes?
- Como abrir a base de clientes?

---
id: clientes-faq-02
titulo: Como cadastrar um novo cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: permissão para criar clientes
intencoes: [criar cliente, novo cadastro, adicionar cliente]
palavras-chave: [novo cliente, cadastrar, adicionar]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-03, clientes-tut-01]
fonte-interna: src/components/crm/ClientsModule.tsx, EditClientDialog.tsx
---

# Como cadastrar um novo cliente?

## Resposta direta
Em **Gestão de Clientes › Clientes**, clique em **Novo Cliente**, preencha o nome completo (obrigatório) e demais dados, e salve.

## Antes de começar
- O nome do cliente é obrigatório.
- E-mail e telefone, quando informados, passam por validação de formato.

## Como fazer
1. Vá em **Gestão de Clientes › Clientes**.
2. Clique em **Novo Cliente**.
3. Preencha **Nome Completo**, **Email**, **Telefone**, **Cidade** e demais campos disponíveis.
4. Clique em **Salvar**.

## Resultado esperado
O cliente passa a aparecer na lista e fica disponível para uso em oportunidades, orçamentos, roteiros e carteira digital.

## Outras formas de perguntar
- Como adiciono um cliente novo?
- Como faço o cadastro inicial?

---
id: clientes-faq-03
titulo: Quais campos são obrigatórios para criar um cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: criar cliente
intencoes: [campos obrigatórios, dados mínimos, o que precisa preencher]
palavras-chave: [obrigatório, mínimo, validação, nome, email]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-02, clientes-prob-04]
fonte-interna: src/components/crm/EditClientDialog.tsx
---

# Quais campos são obrigatórios para criar um cliente?

## Resposta direta
Apenas o **Nome** é obrigatório. Se você informar **Email** ou **Telefone**, eles passam por validação de formato.

## Detalhes
- Mensagem **"Nome é obrigatório"** aparece se o campo ficar vazio.
- Mensagens **"E-mail inválido"** ou **"Telefone inválido"** aparecem se o formato estiver incorreto.
- Demais campos (cidade, observações, preferências, datas de aniversário) são opcionais.

## Resultado esperado
Com nome válido o cadastro é salvo, mesmo sem contato.

## Outras formas de perguntar
- O que preciso preencher para salvar um cliente?
- Posso cadastrar só com o nome?

---
id: clientes-faq-04
titulo: Como editar os dados de um cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar cliente
intencoes: [editar cliente, atualizar dados, corrigir cadastro]
palavras-chave: [editar, atualizar, alterar, corrigir]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-tut-02]
fonte-interna: src/components/crm/EditClientDialog.tsx
---

# Como editar os dados de um cliente?

## Resposta direta
Na lista de clientes, abra o cliente desejado e clique em **Editar Cliente**. Faça as alterações e clique em **Salvar alterações**.

## Como fazer
1. Em **Gestão de Clientes › Clientes**, localize o cliente.
2. Clique em **Abrir Cliente** ou no nome.
3. Selecione **Editar Cliente**.
4. Atualize os campos e clique em **Salvar alterações**.

## Resultado esperado
Os novos dados aparecem na lista e nos módulos vinculados (oportunidades, orçamentos, roteiros).

---
id: clientes-faq-05
titulo: Como localizar rapidamente um cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar clientes
intencoes: [buscar cliente, pesquisar, encontrar cliente]
palavras-chave: [buscar, pesquisa, filtro, encontrar]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-06, clientes-prob-01]
fonte-interna: src/components/crm/ClientsModule.tsx
---

# Como localizar rapidamente um cliente?

## Resposta direta
Use o campo **Buscar clientes...** no topo da aba **Clientes**. Digite parte do nome, e-mail ou telefone.

## Como fazer
1. Abra **Gestão de Clientes › Clientes**.
2. Clique em **Buscar clientes...**.
3. Digite parte do nome ou contato.

## Resultado esperado
A lista é filtrada em tempo real conforme a busca.

---
id: clientes-faq-06
titulo: Existe um filtro por status de cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar clientes
intencoes: [filtrar clientes, status, categorização]
palavras-chave: [filtro, status, lead, ativo]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-05]
fonte-interna: src/components/crm/ClientsModule.tsx
---

# Existe um filtro por status de cliente?

## Resposta direta
Sim. Use **Filtrar status** ao lado do campo de busca para restringir a lista por status, incluindo opções como **Lead** e **Cliente indicada**.

## Outras formas de perguntar
- Como vejo só os leads?
- Como separo clientes ativos?

---
id: clientes-faq-07
titulo: Posso cadastrar várias viagens para o mesmo cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar cliente
intencoes: [viagens vinculadas, histórico de viagens, adicionar viagem]
palavras-chave: [viagem, histórico, vincular]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-tut-08]
fonte-interna: src/components/crm/AddTripDialog.tsx
---

# Posso cadastrar várias viagens para o mesmo cliente?

## Resposta direta
Sim. Cada cliente pode ter múltiplas viagens vinculadas. Use o botão **Adicionar Viagem** dentro do perfil do cliente.

## Como fazer
1. Abra o cliente.
2. Clique em **Adicionar Viagem**.
3. Preencha destino (por exemplo "Paris, França"), datas e demais informações.
4. Salve.

## Resultado esperado
A viagem aparece na lista de viagens do cliente e pode ser usada nos módulos relacionados.

---
id: clientes-faq-08
titulo: Qual a diferença entre cliente e passageiro?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: nenhuma específica
intencoes: [cliente vs passageiro, conceitos, papéis]
palavras-chave: [cliente, passageiro, viajante, comprador]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-bp-03]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/gestao-clientes.md
---

# Qual a diferença entre cliente e passageiro?

## Resposta direta
**Cliente** é a entidade central cadastrada no módulo Gestão de Clientes — em geral o responsável pela compra. **Passageiro** é cada pessoa que efetivamente viaja, podendo ou não ser o próprio cliente.

## Detalhes
- O cliente é exigido para criar orçamentos, roteiros, carteiras e oportunidades.
- A lista de passageiros pode incluir o cliente e demais viajantes, definida na viagem ou no orçamento.

## Outras formas de perguntar
- Cliente e viajante são a mesma coisa?
- Onde cadastro os passageiros?

---
id: clientes-faq-09
titulo: Como adicionar observações internas sobre um cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar cliente
intencoes: [observações, anotações, notas internas]
palavras-chave: [observação, anotação, nota interna]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-04]
fonte-interna: src/components/crm/EditClientDialog.tsx
---

# Como adicionar observações internas sobre um cliente?

## Resposta direta
Ao editar o cliente, use os campos **Observações Internas** ou **Observações Gerais**. As observações internas não são visíveis ao cliente.

## Como fazer
1. Edite o cliente.
2. Role até **Observações Internas**.
3. Escreva o conteúdo e salve.

## Atenção
Use as observações internas para informações sensíveis ou estratégicas — elas ficam restritas à equipe.

---
id: clientes-faq-10
titulo: Como cadastrar preferências de viagem do cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar cliente
intencoes: [preferências, perfil de viagem, gostos]
palavras-chave: [preferência, perfil, gosto, viagem]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-bp-04]
fonte-interna: src/components/crm/EditClientDialog.tsx
---

# Como cadastrar preferências de viagem do cliente?

## Resposta direta
No formulário do cliente há o campo **Preferências de Viagem** (exemplo de placeholder: "Prefere praias, viaja em família, classe executiva..."). Preencha em texto livre.

## Resultado esperado
As preferências ficam disponíveis para consulta rápida ao montar novos orçamentos e roteiros.

---
id: clientes-faq-11
titulo: É possível registrar a data de aniversário do cliente?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar cliente
intencoes: [aniversário, data de nascimento, relacionamento]
palavras-chave: [aniversário, data, nascimento]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/EditClientDialog.tsx
---

# É possível registrar a data de aniversário do cliente?

## Resposta direta
Sim. O cadastro tem campos **Dia Aniversário**, **Mês Aniversário** e **Ano Aniversário** (opcional). Você pode preencher apenas dia e mês se preferir.

---
id: clientes-faq-12
titulo: Como importar uma lista de contatos para Gestão de Clientes?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular]
nivel: intermediário
plano: não-confirmado
permissoes: criar clientes em lote
intencoes: [importar contatos, importação em massa, planilha]
palavras-chave: [importar, planilha, csv, xlsx, contatos]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-tut-06, clientes-prob-05]
fonte-interna: src/components/crm/ImportContactsDialog.tsx
---

# Como importar uma lista de contatos para Gestão de Clientes?

## Resposta direta
Use a opção **Novo Contato › Importar** disponível em Clientes. É possível colar uma lista de contatos ou enviar um arquivo `.xlsx` ou `.csv`.

## Antes de começar
- A planilha precisa ter pelo menos um cabeçalho e uma linha de dados.
- É obrigatório existir uma coluna **Nome Completo** ou **Nome**.

## Como fazer
1. Clique em **Importar**.
2. Selecione o arquivo `.xlsx`/`.csv` ou cole os contatos no campo **Cole seus contatos aqui...**.
3. Conclua a importação.

## Problemas relacionados
- "Coluna obrigatória não encontrada"
- "Planilha vazia"
- "Use arquivos .xlsx ou .csv"

---
id: clientes-faq-13
titulo: Que formatos de arquivo a importação aceita?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular]
nivel: intermediário
plano: não-confirmado
permissoes: importar clientes
intencoes: [formato aceito, extensão, csv, xlsx]
palavras-chave: [formato, extensão, arquivo]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-12]
fonte-interna: src/components/crm/ImportContactsDialog.tsx
---

# Que formatos de arquivo a importação aceita?

## Resposta direta
Apenas **`.xlsx`** e **`.csv`**. Outros formatos retornam a mensagem **"Formato não suportado"** com a orientação **"Use arquivos .xlsx ou .csv"**.

---
id: clientes-faq-14
titulo: Posso adicionar um cliente direto pelo funil sem sair da tela?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: criar clientes
intencoes: [cadastro rápido, criar cliente do funil, atalho]
palavras-chave: [cadastro rápido, quick add, atalho]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-02]
fonte-interna: src/components/crm/QuickAddClientDialog.tsx
---

# Posso adicionar um cliente direto pelo funil sem sair da tela?

## Resposta direta
Sim. Existe o cadastro rápido **Novo Contato**, que cria o cliente com poucos campos (nome, telefone, e-mail) e ao salvar mostra a mensagem **"Cliente adicionado ao funil"**.

## Outras formas de perguntar
- Como faço um cadastro rápido?
- Quero adicionar um lead sem abrir o formulário completo.

---
id: clientes-faq-15
titulo: O cliente é obrigatório para criar oportunidades, orçamentos e roteiros?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: criar registros nos demais módulos
intencoes: [cliente obrigatório, relacionamento entre módulos]
palavras-chave: [obrigatório, orçamento, roteiro, carteira, oportunidade]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-08]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/gestao-clientes.md
---

# O cliente é obrigatório para criar oportunidades, orçamentos e roteiros?

## Resposta direta
Sim. O cliente é a entidade central da plataforma e é exigido para criar **oportunidades**, **orçamentos**, **roteiros** e **carteiras digitais**.

## Boas práticas
Cadastre o cliente antes ou use o cadastro rápido ao iniciar um novo registro.

---
id: clientes-faq-16
titulo: Por que aparece "Cliente indicada" no filtro de status?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular]
nivel: intermediário
plano: não-confirmado
permissoes: visualizar clientes
intencoes: [status especial, indicação, classificação]
palavras-chave: [indicação, indicada, status]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-06]
fonte-interna: src/components/crm/ClientsModule.tsx
---

# Por que aparece "Cliente indicada" no filtro de status?

## Resposta direta
**Cliente indicada** é um dos status disponíveis no filtro e identifica clientes que chegaram por indicação. Você pode usar essa opção para isolar esse grupo na lista.

---
id: clientes-faq-17
titulo: Como vinculo um cliente a uma oportunidade do CRM?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: criar oportunidades
intencoes: [vincular cliente, oportunidade, CRM]
palavras-chave: [vincular, oportunidade, CRM]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-tut-07]
fonte-interna: src/components/crm/OpportunityForm.tsx
---

# Como vinculo um cliente a uma oportunidade do CRM?

## Resposta direta
Ao criar a oportunidade no CRM, selecione o cliente no campo **Selecione um cliente**. Se ele ainda não existir, use o cadastro rápido **Novo Contato** para criá-lo na hora.

## Conteúdos relacionados
- Tutorial: criar oportunidade a partir do cliente (módulo CRM)

---
id: clientes-faq-18
titulo: Onde vejo as métricas dos meus clientes?
modulo: Gestão de Clientes
tipo: faq
publico: [agente, titular]
nivel: iniciante
plano: não-confirmado
permissoes: ver dashboard
intencoes: [métricas, dashboard, indicadores]
palavras-chave: [dashboard, métricas, indicadores]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/DashboardModule.tsx
---

# Onde vejo as métricas dos meus clientes?

## Resposta direta
Em **Gestão de Clientes**, a aba **Dashboard** apresenta o painel consolidado com KPIs e indicadores relacionados aos clientes.

---
id: clientes-faq-19
titulo: A Gestão de Clientes tem aba de metas comerciais?
modulo: Gestão de Clientes
tipo: faq
publico: [titular]
nivel: intermediário
plano: não-confirmado
permissoes: gerenciar metas
intencoes: [metas, vendas, objetivos]
palavras-chave: [metas, sales goals, objetivos]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/pages/GestaoClientes.tsx, src/components/crm/SalesGoalsModule.tsx
---

# A Gestão de Clientes tem aba de metas comerciais?

## Resposta direta
Sim. Dentro de **Gestão de Clientes** existe a aba **Metas**, que centraliza as metas de vendas da agência.

---
id: clientes-faq-20
titulo: Posso definir permissões de acesso ao cadastro de clientes para membros da equipe?
modulo: Gestão de Clientes
tipo: faq
publico: [titular]
nivel: avançado
plano: não-confirmado
permissoes: gerenciar equipe
intencoes: [permissões, equipe, controle de acesso]
palavras-chave: [permissão, equipe, acesso]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-prob-04]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/equipe-e-permissoes.md
---

# Posso definir permissões de acesso ao cadastro de clientes para membros da equipe?

## Resposta direta
Sim. As permissões da equipe controlam o que cada membro vê e edita em Gestão de Clientes. A configuração é feita na aba **Equipe** dentro de Gestão de Clientes ou na área de configurações de equipe.

## Conteúdo relacionado
Consulte o módulo Equipe e Permissões para o detalhamento completo de cada permissão.


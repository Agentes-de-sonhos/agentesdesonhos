# Perguntas frequentes — Operações

> 20 FAQs canônicas confirmadas a partir da Base Mestre e da inspeção dos componentes do módulo Operações em `/gestao-clientes/operacoes`.

---
id: operacoes-faq-01
titulo: Onde fica o módulo de Operações?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: acessar Operações
intencoes: [onde fica operações, abrir operações]
palavras-chave: [operações, acessar, menu]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-visao-geral]
fonte-interna: src/pages/GestaoClientes.tsx
---

# Onde fica o módulo de Operações?

## Resposta direta
Em **Gestão de Clientes**, abra a aba **Operações**. A URL é `/gestao-clientes/operacoes`.

## Como fazer
1. No menu principal, clique em **Gestão de Clientes**.
2. Selecione a aba **Operações**.

## Resultado esperado
O quadro de operações é aberto, com colunas representando as etapas do processo.

---
id: operacoes-faq-02
titulo: O que é uma operação no Agentes de Sonhos?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: nenhuma específica
intencoes: [definição, conceito, para que serve]
palavras-chave: [operação, definição, pós-venda]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-faq-03, operacoes-bp-01]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/operacoes.md
---

# O que é uma operação no Agentes de Sonhos?

## Resposta direta
Operação é o acompanhamento pós-venda de uma viagem: reúne tarefas, checklist por etapa, prazos, anexos, etiquetas e histórico em um único pipeline.

## Quando usar
Após confirmar a venda, abra uma operação para garantir que todas as providências (vouchers, emissão, transfer, briefings) sejam executadas até o embarque e retorno.

---
id: operacoes-faq-03
titulo: Qual é a diferença entre oportunidade, venda e operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: nenhuma específica
intencoes: [diferença entre módulos, oportunidade vs operação]
palavras-chave: [oportunidade, venda, operação, viagem]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-faq-02, operacoes-bp-04]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/operacoes.md
---

# Qual é a diferença entre oportunidade, venda e operação?

## Resposta direta
- **Oportunidade** (CRM): negociação comercial em andamento.
- **Venda**: efetivação financeira do negócio.
- **Operação**: acompanhamento pós-venda da viagem, com tarefas e checklist.

## Observação
A vinculação automática entre venda e operação não está totalmente confirmada — em geral, a operação é criada manualmente a partir do cliente/venda.

---
id: operacoes-faq-04
titulo: Como criar uma nova operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: criar operações
intencoes: [criar operação, nova operação]
palavras-chave: [nova, criar, operação]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-tut-01]
fonte-interna: src/components/crm/operations/CreateOperationDialog.tsx
---

# Como criar uma nova operação?

## Resposta direta
Em **Gestão de Clientes › Operações**, clique em **Nova Operação**, selecione o cliente, dê um título (por exemplo, "Lua de mel Maldivas") e adicione ao menos uma tarefa antes de salvar.

## Antes de começar
- O cliente precisa existir em Gestão de Clientes.
- A mensagem **"Adicione ao menos uma tarefa antes de salvar"** indica que tarefas iniciais são exigidas.

## Resultado esperado
Aparece o toast **"Operação criada"** e o card surge na coluna inicial do quadro.

---
id: operacoes-faq-05
titulo: O que significam as colunas do quadro de Operações?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar operações
intencoes: [etapas, colunas, pipeline]
palavras-chave: [etapa, coluna, pipeline]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-faq-06, operacoes-bp-01]
fonte-interna: src/components/crm/operations/OperationsModule.tsx
---

# O que significam as colunas do quadro de Operações?

## Resposta direta
Cada coluna representa uma etapa do pipeline da operação (por exemplo, **Embarque** e **Retorno**). Você arrasta a operação entre as colunas conforme o atendimento evolui.

## Personalização
É possível criar colunas adicionais pelo botão de nova coluna (campo **Nome da nova coluna**).

---
id: operacoes-faq-06
titulo: Como mover uma operação entre etapas?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar operações
intencoes: [mover, etapa, arrastar]
palavras-chave: [mover, etapa, arrastar, pipeline]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-tut-03]
fonte-interna: src/components/crm/operations/OperationsModule.tsx
---

# Como mover uma operação entre etapas?

## Resposta direta
Arraste o card da operação até a coluna desejada. Ao soltar, aparece o toast **"Etapa alterada"** confirmando a mudança.

## Atenção
A movimentação fica registrada no histórico da operação.

---
id: operacoes-faq-07
titulo: Como buscar uma operação específica?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar operações
intencoes: [buscar operação, pesquisa]
palavras-chave: [buscar, pesquisa, filtro]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationsModule.tsx
---

# Como buscar uma operação específica?

## Resposta direta
Use o campo **Buscar operações...** no topo do quadro. A pesquisa filtra os cards em tempo real.

---
id: operacoes-faq-08
titulo: Como adicionar uma tarefa à operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar operações
intencoes: [adicionar tarefa, criar tarefa]
palavras-chave: [tarefa, checklist, atividade]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-tut-05]
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Como adicionar uma tarefa à operação?

## Resposta direta
Abra a operação e use o campo **Adicionar tarefa...**, digite o título e pressione **Enter** para incluir.

## Resultado esperado
A tarefa aparece na lista de tarefas da operação e pode ser marcada como concluída posteriormente.

---
id: operacoes-faq-09
titulo: Existe checklist por etapa?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: editar operações
intencoes: [checklist, etapa, template]
palavras-chave: [checklist, etapa, template]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-tut-07]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/operacoes.md
---

# Existe checklist por etapa?

## Resposta direta
Sim. É possível salvar um conjunto de tarefas como **checklist padrão** para uma etapa. Após salvar, aparece a mensagem **"Checklist salvo como padrão para esta etapa."**.

## Detalhes
- O modelo personalizado pode ser removido. Quando isso ocorre, aparece: **"Modelo personalizado removido. Novas operações usarão o checklist sugerido."**.
- Templates podem ser globais ou específicos por estágio.

---
id: operacoes-faq-10
titulo: Como anexar arquivos à operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar operações
intencoes: [anexo, arquivo, upload]
palavras-chave: [anexo, arquivo, upload, documento]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-prob-04]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/operacoes.md
---

# Como anexar arquivos à operação?

## Resposta direta
Dentro da operação, utilize a área de anexos para adicionar documentos relevantes (vouchers, comprovantes, contratos). Os arquivos ficam vinculados à operação e podem ser consultados a qualquer momento pela equipe com acesso.

---
id: operacoes-faq-11
titulo: É possível registrar notas durante a operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar operações
intencoes: [nota, anotação, registro]
palavras-chave: [nota, anotação, registro]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# É possível registrar notas durante a operação?

## Resposta direta
Sim. Abra a operação e use o campo **Adicionar uma nota ou registro...**. Após salvar, aparece o toast **"Nota registrada"** e a entrada fica visível no histórico.

---
id: operacoes-faq-12
titulo: Como ver o histórico de uma operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar operações
intencoes: [histórico, timeline, registro]
palavras-chave: [histórico, timeline, linha do tempo]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationHistoryDialog.tsx
---

# Como ver o histórico de uma operação?

## Resposta direta
Abra a operação e acesse a opção de histórico/linha do tempo. Lá ficam registradas mudanças de etapa, notas, ações da equipe e demais eventos importantes.

---
id: operacoes-faq-13
titulo: Como usar etiquetas na operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: editar operações
intencoes: [etiqueta, label, marcação]
palavras-chave: [etiqueta, label, tag]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationLabelPicker.tsx
---

# Como usar etiquetas na operação?

## Resposta direta
Use o seletor de etiquetas dentro da operação para aplicar marcações que ajudam na organização (por exemplo, tipo de viagem, prioridade ou status interno).

## Boa prática
Combine com a equipe um conjunto reduzido e estável de etiquetas para evitar proliferação.

---
id: operacoes-faq-14
titulo: Posso compartilhar o link de uma operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: visualizar operações
intencoes: [compartilhar, link, copiar]
palavras-chave: [link, compartilhar, copiar]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Posso compartilhar o link de uma operação?

## Resposta direta
Sim. A operação possui ação para copiar o link interno; ao executar aparece o toast **"Link copiado"**. O link é destinado ao uso da equipe autenticada.

## Atenção
O link não substitui a publicação pública de roteiro ou carteira — ele leva à operação dentro da plataforma.

---
id: operacoes-faq-15
titulo: Como atualizar os dados de uma operação?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: editar operações
intencoes: [editar operação, atualizar]
palavras-chave: [editar, atualizar, alterar]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Como atualizar os dados de uma operação?

## Resposta direta
Abra a operação, ajuste os campos disponíveis e salve. Ao concluir aparece o toast **"Operação atualizada"**.

---
id: operacoes-faq-16
titulo: Como remover uma operação?
modulo: Operações
tipo: faq
publico: [titular]
nivel: avançado
plano: não-confirmado
permissoes: excluir operações
intencoes: [excluir, remover, apagar]
palavras-chave: [excluir, remover, deletar]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Como remover uma operação?

## Resposta direta
Use a ação de remoção dentro da operação. Aparece a confirmação **"Remover esta operação?"** antes de concluir.

## Atenção
Confira anexos e tarefas vinculadas antes de remover. A ação não pode ser desfeita.

---
id: operacoes-faq-17
titulo: O que aparece no card de uma operação no quadro?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar operações
intencoes: [card, informações visíveis]
palavras-chave: [card, kanban, informações]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationCard.tsx
---

# O que aparece no card de uma operação no quadro?

## Resposta direta
O card mostra o título da operação, o cliente associado e referências de **Viagem**, **Embarque** e **Retorno** quando informados, além de etiquetas e indicadores rápidos.

---
id: operacoes-faq-18
titulo: Como criar uma nova coluna (etapa) no quadro?
modulo: Operações
tipo: faq
publico: [titular]
nivel: intermediário
plano: não-confirmado
permissoes: gerenciar pipeline
intencoes: [nova coluna, etapa, criar pipeline]
palavras-chave: [coluna, etapa, pipeline]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-faq-05]
fonte-interna: src/components/crm/operations/OperationsModule.tsx
---

# Como criar uma nova coluna (etapa) no quadro?

## Resposta direta
Use a ação de adicionar coluna no quadro de operações. Será exibido o campo **Nome da nova coluna**; digite o nome desejado e salve.

## Boa prática
Antes de criar, alinhe com a equipe para evitar etapas duplicadas.

---
id: operacoes-faq-19
titulo: A operação tem relação com a Carteira Digital e o roteiro?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: nenhuma específica
intencoes: [relação com outros módulos, carteira, roteiro]
palavras-chave: [carteira, roteiro, integração]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-bp-04]
fonte-interna: docs/base-conhecimento-agentes-de-sonhos/modulos/operacoes.md
---

# A operação tem relação com a Carteira Digital e o roteiro?

## Resposta direta
A operação acompanha a viagem do mesmo cliente para o qual a Carteira Digital e o roteiro foram criados. A operação não substitui esses módulos — ela coordena tarefas internas até o embarque e o retorno.

---
id: operacoes-faq-20
titulo: Como saber quais tarefas estão pendentes hoje?
modulo: Operações
tipo: faq
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar operações
intencoes: [tarefas do dia, pendências, hoje]
palavras-chave: [hoje, pendência, tarefa, prazo]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-bp-03]
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Como saber quais tarefas estão pendentes hoje?

## Resposta direta
Abra a operação e consulte a lista de tarefas. Itens com prazo identificado como **Hoje** aparecem destacados, facilitando a priorização do dia.


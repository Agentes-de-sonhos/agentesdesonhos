---
id: clientes-tut-06
titulo: Importar contatos a partir de planilha
modulo: Gestão de Clientes
tipo: tutorial
publico: [agente, titular]
nivel: intermediário
plano: não-confirmado
permissoes: importar clientes
intencoes: [importar, planilha, csv, xlsx]
palavras-chave: [importar, planilha, csv, xlsx]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-12, clientes-faq-13, clientes-prob-05]
fonte-interna: src/components/crm/ImportContactsDialog.tsx
---

# Importar contatos a partir de planilha

## O que você fará
Cadastrar vários clientes de uma única vez usando um arquivo `.xlsx` ou `.csv`.

## Antes de começar
- A planilha deve ter um cabeçalho na primeira linha.
- É obrigatória a coluna **Nome Completo** ou **Nome**.

## Passo a passo
1. Vá em **Gestão de Clientes › Clientes**.
2. Clique em **Novo Contato › Importar** (ou na opção de importação disponível).
3. Selecione o arquivo `.xlsx` ou `.csv`.
4. Conclua a importação.

## Resultado esperado
Os clientes aparecem na lista após o processamento.

## Problemas comuns
- "Coluna obrigatória não encontrada" — adicione a coluna **Nome Completo**.
- "Planilha vazia" — verifique se há dados após o cabeçalho.
- "Formato não suportado" — use apenas `.xlsx` ou `.csv`.

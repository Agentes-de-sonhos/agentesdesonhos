---
id: clientes-prob-05
titulo: Erro ao importar planilha de clientes
modulo: Gestão de Clientes
tipo: problema-comum
publico: [agente, titular]
nivel: intermediário
plano: não-confirmado
permissoes: importar clientes
intencoes: [erro na importação, planilha não aceita]
palavras-chave: [importação, planilha, erro, csv, xlsx]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-tut-06]
fonte-interna: src/components/crm/ImportContactsDialog.tsx
---

# Erro ao importar planilha de clientes

## Sintoma
Ao tentar importar, aparece uma das mensagens: **"Erro ao ler planilha"**, **"Planilha vazia"**, **"Coluna obrigatória não encontrada"** ou **"Formato não suportado"**.

## Causas possíveis
- Arquivo não está em `.xlsx` ou `.csv`.
- A planilha não tem cabeçalho.
- Falta a coluna **Nome Completo** ou **Nome**.
- A planilha está vazia ou tem apenas o cabeçalho.

## Solução passo a passo
1. Confirme que o arquivo é `.xlsx` ou `.csv`. Caso contrário, use **"Use arquivos .xlsx ou .csv"**.
2. Garanta que exista uma linha de cabeçalho na primeira linha.
3. Inclua a coluna **Nome Completo**.
4. Verifique se há ao menos uma linha de dados.
5. Tente importar novamente.

## Quando procurar suporte
Persistindo o erro, envie a planilha sem dados pessoais sensíveis (apenas o cabeçalho e dois exemplos fictícios) ao suporte.

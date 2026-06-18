---
id: operacoes-prob-05
titulo: Mensagem "Não foi possível restaurar" ao desfazer ação
modulo: Operações
tipo: problema-comum
publico: [agente, titular, equipe]
nivel: avançado
plano: não-confirmado
permissoes: editar operações
intencoes: [não restaurar, desfazer falhou]
palavras-chave: [restaurar, desfazer, erro]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: []
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Mensagem "Não foi possível restaurar" ao desfazer ação

## Sintoma
Após excluir/alterar um item da operação, ao tentar desfazer aparece o toast **"Não foi possível restaurar"**.

## Causas possíveis
- A janela de desfazer expirou.
- A versão do item foi alterada por outro membro entre a remoção e a tentativa de restauração.

## Solução passo a passo
1. Recrie manualmente o item (tarefa, nota ou ajuste) na operação.
2. Documente em uma nota o que foi recriado para manter o histórico.

## Quando procurar suporte
Se o erro for recorrente em várias operações no mesmo dia, registre um chamado descrevendo qual ação você tentava desfazer.

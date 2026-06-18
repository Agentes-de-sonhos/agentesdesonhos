---
id: clientes-prob-03
titulo: Cadastro de cliente duplicado
modulo: Gestão de Clientes
tipo: problema-comum
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: editar clientes
intencoes: [duplicidade, cliente repetido]
palavras-chave: [duplicado, repetido, duas vezes]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-bp-01]
fonte-interna: src/components/crm/ClientsModule.tsx
---

# Cadastro de cliente duplicado

## Sintoma
O mesmo cliente aparece duas ou mais vezes na lista, geralmente com variações de nome, e-mail ou telefone.

## Causas possíveis
- Cadastros independentes feitos por membros diferentes da equipe.
- Importação de planilha com registros que já existiam.
- Uso de cadastro rápido sem confirmar se o cliente já existia.

## Como verificar
1. Pesquise o nome completo e variações.
2. Confira e-mail e telefone para identificar o duplicado real.

## Solução passo a passo
1. Identifique qual registro tem o histórico mais completo (viagens, oportunidades, observações).
2. Atualize esse registro com qualquer dado complementar do duplicado.
3. Verifique se o duplicado tem vínculos ativos com oportunidades, orçamentos, roteiros, carteiras ou operações antes de qualquer ação.

## Quando procurar suporte
A exclusão de cliente com vínculos a vendas e operações tem comportamento exato pendente de validação. Em caso de dúvida, abra um chamado antes de excluir.

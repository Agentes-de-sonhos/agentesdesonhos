---
id: operacoes-prob-02
titulo: Não consigo mover a operação entre etapas
modulo: Operações
tipo: problema-comum
publico: [agente, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: editar operações
intencoes: [não mover, arrastar não funciona]
palavras-chave: [arrastar, mover, etapa, bloqueado]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-faq-06, operacoes-tut-03]
fonte-interna: src/components/crm/operations/OperationsModule.tsx
---

# Não consigo mover a operação entre etapas

## Sintoma
Você arrasta o card de operação, solta sobre outra coluna e o card volta para a posição original. Não aparece o toast **"Etapa alterada"**.

## Causas possíveis
- O perfil não tem permissão de edição.
- A operação está com a tela aberta em outra aba e há conflito de versão.

## Como verificar
1. Confirme com o titular se você tem permissão de edição em Operações.
2. Feche o card aberto e tente arrastar com o card fechado.

## Solução passo a passo
1. Recarregue a aba do navegador.
2. Tente novamente arrastar até a coluna desejada.
3. Persistindo, peça ao titular para ajustar as permissões.

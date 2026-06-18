---
id: operacoes-prob-01
titulo: Operação criada não aparece no quadro
modulo: Operações
tipo: problema-comum
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: visualizar operações
intencoes: [operação não aparece, sumiu]
palavras-chave: [não aparece, sumiu, criado]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-faq-07]
fonte-interna: src/components/crm/operations/OperationsModule.tsx
---

# Operação criada não aparece no quadro

## Sintoma
Você cria uma operação, vê a mensagem **"Operação criada"**, mas o card não aparece no quadro.

## Causas possíveis
- Há um termo digitado em **Buscar operações...** filtrando os cards.
- A coluna inicial está fora da área visível por excesso de operações.
- O membro logado não tem permissão para visualizar aquela coluna.

## Como verificar
1. Limpe o campo **Buscar operações...**.
2. Role o quadro horizontalmente até a coluna inicial.
3. Confirme se a permissão de visualização está ativa para o seu perfil.

## Solução passo a passo
1. Apague qualquer texto na busca.
2. Recarregue a tela do módulo.
3. Caso continue sem aparecer, contate o titular para revisar permissões.

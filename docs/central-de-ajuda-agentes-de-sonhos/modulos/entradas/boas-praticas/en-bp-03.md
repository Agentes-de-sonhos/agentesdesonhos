---
id: en-bp-03
titulo: Use a descrição da entrada para contar a origem do valor
modulo: Entradas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - use a descrição da entrada para contar a origem do valor
palavras-chave:
  - boa prática
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Use a descrição da entrada para contar a origem do valor

## Por que importa
Uma descrição clara torna a entrada compreensível semanas depois, mesmo sem abrir a venda relacionada. Isso facilita auditoria e troca de turno entre membros.

## Como aplicar no Agentes de Sonhos
- Informe cliente, serviço ou motivo no campo **Descrição/Observações**.
- Em entradas avulsas (sem venda), explique a origem do dinheiro.
- Evite siglas internas que só uma pessoa entenda.

## Erros que ajuda a evitar
- Entradas sem contexto.
- Confusão entre recebimentos parecidos.
- Pedidos de explicação repetidos para a equipe.
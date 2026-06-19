---
id: orcamentos-bp-01
titulo: Confirme a moeda antes de salvar o primeiro serviço
modulo: Orçamentos
tipo: boas-praticas
publico: [titular, agente]
nivel: intermediário
plano: não-confirmado
permissoes: usar módulo Orçamentos
intencoes: [boas práticas, orcamentos]
palavras-chave: [boa prática, orcamentos]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [orcamentos-faq-02, orcamentos-prob-03]
fonte-interna: src/lib/quoteCurrency.ts
---

# Confirme a moeda antes de salvar o primeiro serviço

## Por que importa
A moeda é definitiva no orçamento. Trocá-la depois exige recriar a proposta inteira.

## Como aplicar no Agentes de Sonhos
1. Antes de salvar, confirme se o pagamento será feito em BRL, USD ou EUR.
2. Em vendas internacionais, defina a moeda na qual o cliente efetivamente pagará.

## Erros que evita
- Trabalho duplicado de recriar orçamento.
- Inconsistência entre o orçamento e a venda no Financeiro.

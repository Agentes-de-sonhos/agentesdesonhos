---
id: orcamentos-prob-03
titulo: Moeda do orçamento não pode ser alterada
modulo: Orçamentos
tipo: problema-comum
publico: [agente, titular]
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Orçamentos
intencoes: [moeda do orçamento não pode ser alterada]
palavras-chave: [problema, orcamentos]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [orcamentos-faq-02, orcamentos-faq-09]
fonte-interna: src/lib/quoteCurrency.ts
---

# Moeda do orçamento não pode ser alterada

## Sintoma
Ao tentar mudar a moeda em um orçamento existente, o campo está bloqueado.

## Causas possíveis
- Regra do produto: a moeda é definida na criação e fica fixa.
- Tentativa em orçamento já salvo.

## Como verificar
1. Confirme que o orçamento já foi salvo.
2. Verifique a moeda atual exibida no cabeçalho.

## Solução passo a passo
1. Duplique o orçamento.
2. Na cópia, defina a nova moeda na criação.
3. Ajuste serviços e exclua o orçamento antigo se quiser.

## Quando procurar suporte
Não há necessidade de suporte: a regra é intencional para preservar a consistência financeira.

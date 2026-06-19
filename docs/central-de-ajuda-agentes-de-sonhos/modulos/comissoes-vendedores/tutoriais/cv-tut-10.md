---
id: cv-tut-10
titulo: Conferir comissão de vendedor após registrar a venda
modulo: Comissões e Vendedores
tipo: tutorial
publico:
  - agente
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Comissões e Vendedores
intencoes:
  - conferir comissão de vendedor após registrar a venda
palavras-chave:
  - tutorial
  - comissões e vendedores
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/* | src/hooks/useFinancial.ts | src/hooks/useSellers.ts
---

# Conferir comissão de vendedor após registrar a venda

## O que você fará
Você confirma que a despesa de comissão foi gerada corretamente.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso ao módulo **Comissões e Vendedores**.

## Passo a passo
1. Salve uma venda com vendedor selecionado e percentual definido.
2. Acesse **Financeiro → Despesas**.
3. Localize a despesa de categoria `comissao` correspondente à venda.
4. Confira valor, vendedor e data.

## Resultado esperado
Você confirma que a despesa de comissão foi gerada corretamente.

## Atenção
Confirme as ações antes de salvar — alterações financeiras impactam relatórios e indicadores do mês.

---
id: vd-tut-03
titulo: Adicionar vários produtos à mesma venda
modulo: Vendas
tipo: tutorial
publico:
  - agente
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Vendas
intencoes:
  - adicionar vários produtos à mesma venda
palavras-chave:
  - tutorial
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/* | src/hooks/useFinancial.ts | src/hooks/useSellers.ts
---

# Adicionar vários produtos à mesma venda

## O que você fará
Você terá uma venda com múltiplos itens, cada um com sua comissão e regra de pagamento.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso ao módulo **Vendas**.

## Passo a passo
1. No wizard, avance até a etapa **Produtos**.
2. Clique em **Adicionar produto**.
3. Escolha o tipo (aéreo, hotel, transfer, locação, atração, outro).
4. Preencha descrição, valor de venda e taxas não comissionáveis.
5. Defina o fornecedor pelo SupplierSelector.
6. Configure tipo e valor da comissão.
7. Repita para cada produto e siga para a revisão.

## Resultado esperado
Você terá uma venda com múltiplos itens, cada um com sua comissão e regra de pagamento.

## Atenção
Confirme as ações antes de salvar — alterações financeiras impactam relatórios e indicadores do mês.

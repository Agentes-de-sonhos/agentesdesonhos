---
id: vd-tut-05
titulo: Vincular um vendedor e ajustar a comissão de vendedor
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
  - vincular um vendedor e ajustar a comissão de vendedor
palavras-chave:
  - tutorial
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/* | src/hooks/useFinancial.ts | src/hooks/useSellers.ts
---

# Vincular um vendedor e ajustar a comissão de vendedor

## O que você fará
A despesa de comissão do vendedor passa a ser gerada automaticamente ao salvar.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso ao módulo **Vendas**.

## Passo a passo
1. Na **Revisão** do wizard, abra o campo **Vendedor**.
2. Selecione um vendedor cadastrado.
3. Confira o percentual sugerido (vem do cadastro do vendedor).
4. Ajuste o percentual da venda se necessário.
5. Salve a venda.

## Resultado esperado
A despesa de comissão do vendedor passa a ser gerada automaticamente ao salvar.

## Atenção
Confirme as ações antes de salvar — alterações financeiras impactam relatórios e indicadores do mês.

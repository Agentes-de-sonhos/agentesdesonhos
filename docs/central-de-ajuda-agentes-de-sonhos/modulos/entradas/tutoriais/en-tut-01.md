---
id: en-tut-01
titulo: Registrar uma entrada já recebida
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - registrar uma entrada já recebida
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Registrar uma entrada já recebida

## O que você fará
Uma nova entrada aparece na lista com status **Recebida** e o valor passa a compor o card **Já no bolso** do mês.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso ao módulo **Financeiro → Entradas**.
- Saber o valor, a data e a forma de pagamento do recebimento.

## Passo a passo
1. Em **Financeiro → Entradas**, clique em **Nova Entrada**.
2. No campo **Tipo**, escolha **💰 Já recebi**.
3. Se aplicável, selecione a **Venda vinculada** no menu.
4. Informe **Valor**, **Data**, **Forma de pagamento** e **Descrição/Observações**.
5. Clique em **Criar** para salvar.

## Resultado esperado
Uma nova entrada aparece na lista com status **Recebida** e o valor passa a compor o card **Já no bolso** do mês.

## Atenção
- A exclusão é definitiva. Confirme o valor antes de salvar para evitar retrabalho.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)

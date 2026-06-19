---
id: cv-tut-04
titulo: Vincular um vendedor a uma venda nova
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
  - vincular um vendedor a uma venda nova
palavras-chave:
  - tutorial
  - comissões e vendedores
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/* | src/hooks/useFinancial.ts | src/hooks/useSellers.ts
---

# Vincular um vendedor a uma venda nova

## O que você fará
A comissão do vendedor passa a ser registrada como despesa automática.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso ao módulo **Comissões e Vendedores**.

## Passo a passo
1. Inicie uma **Nova Venda** em **Financeiro → Vendas**.
2. Preencha cliente, destino e produtos.
3. Na **Revisão**, selecione o vendedor no campo correspondente.
4. Ajuste o percentual se necessário.
5. Salve a venda.

## Resultado esperado
A comissão do vendedor passa a ser registrada como despesa automática.

## Atenção
Confirme as ações antes de salvar — alterações financeiras impactam relatórios e indicadores do mês.

---
id: vd-tut-01
titulo: Registrar uma venda do zero
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
  - registrar uma venda do zero
palavras-chave:
  - tutorial
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/* | src/hooks/useFinancial.ts | src/hooks/useSellers.ts
---

# Registrar uma venda do zero

## O que você fará
Você terá uma venda salva no módulo Financeiro, vinculada a cliente, destino e produtos.

## Antes de começar
- Estar logado com perfil **Titular** ou **Financeiro**.
- Ter acesso ao módulo **Vendas**.

## Passo a passo
1. Em **Financeiro → Vendas**, clique em **Nova Venda**.
2. Na etapa **Origem**, escolha **Manual**.
3. Selecione o cliente (ou cadastre um novo pelo ClientSelector).
4. Informe o destino e a data da venda.
5. Adicione um ou mais produtos com tipo, valor, taxas, fornecedor e regra de comissão.
6. Na **Revisão**, selecione vendedor e ajuste comissão.
7. Clique em **Salvar** para persistir a venda.

## Resultado esperado
Você terá uma venda salva no módulo Financeiro, vinculada a cliente, destino e produtos.

## Atenção
Confirme as ações antes de salvar — alterações financeiras impactam relatórios e indicadores do mês.

---
id: en-tut-02
titulo: Registrar uma entrada que ainda vai receber
modulo: Entradas
tipo: tutorial
publico:
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - registrar uma entrada que ainda vai receber
palavras-chave:
  - tutorial
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Registrar uma entrada que ainda vai receber

## O que você fará
A entrada aparece com badge **A receber** e passa a compor o card **A caminho**.

## Antes de começar
- Acesso ao módulo Financeiro/Entradas.
- Saber o valor e a **data prevista** de recebimento.

## Passo a passo
1. Em **Financeiro → Entradas**, clique em **Nova Entrada**.
2. No campo **Tipo**, escolha **⏳ Vou receber**.
3. Informe o **Valor** e a **Data prevista**.
4. Escolha a **Forma de pagamento** esperada e, se quiser, vincule à venda.
5. Clique em **Criar**.

## Resultado esperado
A entrada aparece com badge **A receber** e passa a compor o card **A caminho**.

## Atenção
- Se a data prevista for menor que hoje, a entrada já entra como **Atrasada**.

## Próximos passos
- [Perguntas frequentes do módulo](../faq/00-perguntas-frequentes.md)

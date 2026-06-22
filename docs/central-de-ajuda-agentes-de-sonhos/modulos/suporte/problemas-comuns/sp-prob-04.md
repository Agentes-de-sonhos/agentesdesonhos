---
id: sp-prob-04
titulo: O chamado aparece como Resolvido mas o problema voltou
modulo: Suporte
tipo: problema-comum
publico:
  - titular
  - agente
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: qualquer usuário autenticado
intencoes:
  - o chamado aparece como resolvido mas o problema voltou
palavras-chave:
  - problema
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# O chamado aparece como Resolvido mas o problema voltou

## Sintoma
O status está em **Resolvido**, porém o problema voltou a acontecer.

## Causas possíveis
- O problema retornou após o encerramento.
- A causa original não foi totalmente eliminada.
- Foi marcado como resolvido sem nova verificação.

## Como verificar e resolver
1. Abra um **novo chamado** descrevendo que se trata de retorno do problema.
2. Cite o **assunto** ou referência do chamado anterior.
3. Inclua novos prints, data, horário e passos para reproduzir.

## Resultado esperado
Um novo chamado é criado para continuar a investigação sem reabrir o anterior.

## Quando procurar o suporte
Se for um bug crítico, use a categoria **Reportar Bug**.

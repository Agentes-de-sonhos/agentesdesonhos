---
id: sp-prob-01
titulo: O chamado não envia ao clicar em Enviar Chamado
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
  - o chamado não envia ao clicar em enviar chamado
palavras-chave:
  - problema
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# O chamado não envia ao clicar em Enviar Chamado

## Sintoma
O botão **Enviar Chamado** fica desabilitado ou exibe a mensagem **Preencha todos os campos**.

## Causas possíveis
- **Assunto** ou **Descrição** em branco.
- Categoria não selecionada.
- Conexão de internet instável.

## Como verificar e resolver
1. Preencha **Assunto** e **Descrição** com pelo menos uma frase cada.
2. Confirme que a **Categoria** está selecionada.
3. Verifique sua conexão e tente novamente.

## Resultado esperado
O chamado é criado e aparece na lista com status **Aberto**.

## Quando procurar o suporte
Se persistir, tente em outro navegador e descreva o problema no próximo chamado (não envie senhas).

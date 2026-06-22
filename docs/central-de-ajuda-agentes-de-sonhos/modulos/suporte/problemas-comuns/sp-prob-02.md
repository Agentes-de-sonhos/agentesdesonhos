---
id: sp-prob-02
titulo: O anexo não carrega no chamado
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
  - o anexo não carrega no chamado
palavras-chave:
  - problema
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# O anexo não carrega no chamado

## Sintoma
Você tenta anexar um arquivo e nada aparece na conversa.

## Causas possíveis
- Arquivo muito grande.
- Formato não compatível com a visualização (ainda assim deve ser aceito como link).
- Falha de conexão durante o envio.

## Como verificar e resolver
1. Tente reduzir a resolução da imagem.
2. Confirme se a conexão está estável.
3. Renomeie o arquivo sem caracteres especiais e tente novamente.

## Resultado esperado
O anexo aparece na conversa, como imagem ou como link **📎 Anexo**.

## Quando procurar o suporte
Se continuar falhando, abra um chamado descrevendo o tipo e tamanho do arquivo (não envie o arquivo com dados sensíveis).

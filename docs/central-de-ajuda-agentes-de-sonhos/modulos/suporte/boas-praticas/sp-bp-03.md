---
id: sp-bp-03
titulo: Use o chamado existente em vez de abrir novo para o mesmo tema
modulo: Suporte
tipo: boas-praticas
publico:
  - titular
  - agente
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: qualquer usuário autenticado
intencoes:
  - use o chamado existente em vez de abrir novo para o mesmo tema
palavras-chave:
  - boa prática
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# Use o chamado existente em vez de abrir novo para o mesmo tema

## Por que importa
Quando o assunto é o mesmo, responder no chamado existente mantém o histórico completo e evita que dois atendentes trabalhem em paralelo.

## Como aplicar no Agentes de Sonhos
- Antes de abrir um novo chamado, procure se já existe um em andamento sobre o mesmo tema.
- Responda no chamado original com o complemento de informação.
- Use **novo chamado** apenas para temas realmente diferentes.

## Erros que ajuda a evitar
- Atendimentos duplicados.
- Histórico fragmentado.
- Mensagens contraditórias entre chamados.

---
id: equipe-e-permissoes-mapa-onda-1
titulo: Equipe e Permissões — Mapa de produção (Onda 1)
modulo: Equipe e Permissões
tipo: índice-de-producao
publico: [equipe-documentacao]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Equipe e Permissões — Mapa de produção da Onda 1

## Status
**Concluído com pendências pontuais** (Subonda 1F). Documentação principal pronta. Pendem decisões do proprietário sobre limites exatos por plano e disponibilidade de logs de auditoria ao usuário final.

## Entregas
- 20 FAQs canônicas confirmadas (ep-faq-01 a ep-faq-20).
- 10 tutoriais (ep-tut-01 a ep-tut-10).
- 5 problemas comuns (ep-prob-01 a ep-prob-05).
- 5 boas práticas (ep-bp-01 a ep-bp-05).
- 40 chunks RAG correspondentes adicionados em `rag/BASE-RAG.jsonl`.

## Pendências de produto
- Quota exata de membros por plano (Start, Profissional, Premium).
- Permissões financeiras granulares (hoje liberadas em bloco).
- Permitir o membro redefinir a própria senha sem ação do titular.
- Exposição de auditoria de equipe ao titular na interface.

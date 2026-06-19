# Resumo para Revisão — Subonda 1F

**Data:** 2026-06-19

## Resumo executivo
Subonda 1F concluiu o módulo **Equipe e Permissões**, encerrando a produção documental da Onda 1. Foram entregues 20 FAQs, 10 tutoriais, 5 problemas comuns e 5 boas práticas — totalizando 40 chunks RAG novos. A base passou de 486 para 526 chunks.

## Métricas
- 40 novos chunks confirmados.
- 0 IDs duplicados, 0 linhas inválidas.
- Manifesto RAG promovido para 1.5.0.

## Arquivos criados/atualizados
- `modulos/equipe-e-permissoes/faq/00-perguntas-frequentes.md` (substituiu placeholder)
- `modulos/equipe-e-permissoes/tutoriais/ep-tut-01.md` a `ep-tut-10.md`
- `modulos/equipe-e-permissoes/problemas-comuns/ep-prob-01.md` a `ep-prob-05.md`
- `modulos/equipe-e-permissoes/boas-praticas/ep-bp-01.md` a `ep-bp-05.md`
- `modulos/equipe-e-permissoes/00-mapa-onda-1.md` (status atualizado)
- `rag/BASE-RAG.jsonl`, `rag/INDICE-DE-CHUNKS.md`, `rag/MANIFESTO-RAG.json`
- `chatbot/FALLBACK-E-ESCALONAMENTO.md`, `chatbot/CONTEUDOS-NAO-PUBLICAVEIS.md`
- `20-RELATORIO-DE-ENTREGA-ONDA-1F.md`, `21-RESUMO-PARA-REVISAO-ONDA-1F.md`, `22-RELATORIO-FINAL-ONDA-1.md`, `23-DECISOES-PENDENTES-PROPRIETARIO.md`, `24-MANIFESTO-FINAL-ONDA-1.md`

## Decisões / divergências
- "Desativar" e "Bloquear" são equivalentes na interface (status `blocked`). Adotada a forma "Bloquear" para coerência com a ação visível.
- Não há permissões financeiras granulares hoje; documentado explicitamente.

## Três exemplos representativos
- `ep-faq-03` distingue claramente vendedor (entidade financeira) de membro de equipe (login).
- `ep-tut-04` cobre permissões por etapa, com instrução de marcar **Ver** quando **Editar/Mover** for marcado.
- `ep-prob-05` orienta o limite de membros sem inventar valores específicos por plano.

## Conteúdos excluídos do RAG
Nenhum.

## Riscos
- Dependência de decisão do proprietário sobre quotas e granularidade do financeiro.

## Prontidão para chatbot
Equipe e Permissões: pronto com fallback obrigatório quando a dúvida envolver limite por plano ou alteração de senha pelo próprio membro.

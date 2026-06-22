# Manifesto Final — Onda 2

Data de finalização: 2026-06-22
Versão final do manifesto RAG: **2.3.0**
Total final de chunks: **764**

## Módulos da Onda 2 — status final
| Módulo | Status final | Arquivos principais |
|---|---|---|
| Entradas | Concluído | `modulos/entradas/faq/00-perguntas-frequentes.md`, `modulos/entradas/tutoriais/`, `modulos/entradas/problemas-comuns/`, `modulos/entradas/boas-praticas/` |
| Despesas | Concluído | `modulos/despesas/faq/00-perguntas-frequentes.md`, `modulos/despesas/tutoriais/`, `modulos/despesas/problemas-comuns/`, `modulos/despesas/boas-praticas/` |
| Faturas | Concluído | `modulos/faturas/faq/00-perguntas-frequentes.md`, `modulos/faturas/tutoriais/`, `modulos/faturas/problemas-comuns/`, `modulos/faturas/boas-praticas/` |
| Suporte | Concluído | `modulos/suporte/faq/00-perguntas-frequentes.md`, `modulos/suporte/tutoriais/`, `modulos/suporte/problemas-comuns/`, `modulos/suporte/boas-praticas/` |
| Configurações, Conta e Onboarding | Concluído com pendências pontuais | `modulos/configuracoes/faq/00-perguntas-frequentes.md`, `modulos/configuracoes/tutoriais/`, `modulos/configuracoes/problemas-comuns/`, `modulos/configuracoes/boas-praticas/` |
| Agenda | Concluído com pendências pontuais | `modulos/agenda/faq/00-perguntas-frequentes.md`, `modulos/agenda/tutoriais/`, `modulos/agenda/problemas-comuns/`, `modulos/agenda/boas-praticas/` |

## Relatórios gerados na Onda 2
- `25-RELATORIO-DE-ENTREGA-ONDA-2A.md`
- `26-RESUMO-PARA-REVISAO-ONDA-2A.md`
- `27-RELATORIO-DE-ENTREGA-ONDA-2B.md`
- `28-RESUMO-PARA-REVISAO-ONDA-2B.md`
- `29-RELATORIO-DE-ENTREGA-ONDA-2C.md`
- `30-RESUMO-PARA-REVISAO-ONDA-2C.md`
- `31-DECISOES-PENDENTES-PROPRIETARIO-ONDA-2.md`
- `32-RELATORIO-FINAL-ONDA-2.md`
- `33-RESUMO-PARA-REVISAO-ONDA-2D.md`
- `34-MANIFESTO-FINAL-ONDA-2.md`
- `35-RELATORIO-NORMALIZACAO-RAG-LEGADO.md`
- `36-RELATORIO-DE-ENTREGA-ONDA-2D.md`

## Arquivos RAG
- `rag/BASE-RAG.jsonl` — 764 linhas, todas válidas.
- `rag/MANIFESTO-RAG.json` — versão 2.3.0.
- `rag/INDICE-DE-CHUNKS.md` — atualizado com seção Subonda 2D.

## Mapa de conteúdo
### Pronto para chatbot
Conteúdos confirmados de Entradas, Despesas, Faturas, Suporte, Configurações e Agenda (FAQs, tutoriais e boas práticas com `confidence=confirmado`).

### Pronto com fallback obrigatório
Todas as perguntas sobre: automações financeiras, recorrência, exclusões, SLA, NF, sincronização bidirecional, alteração de e-mail principal, propagação de marca em links públicos. Ver `chatbot/FALLBACK-E-ESCALONAMENTO.md`.

### Pendente
19 decisões consolidadas em `31-DECISOES-PENDENTES-PROPRIETARIO-ONDA-2.md`.

Data da finalização: 2026-06-22.

*Nenhuma alteração funcional foi feita nesta onda.*
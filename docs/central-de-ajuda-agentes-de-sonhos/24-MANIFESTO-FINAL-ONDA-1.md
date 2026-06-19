# Manifesto Final — Onda 1

**Data de finalização:** 2026-06-19  
**Versão do manifesto RAG:** 1.5.0  
**Total de chunks no BASE-RAG.jsonl:** 526

## Módulos da Onda 1 e status final
- **CRM e Oportunidades** — status: concluído — chunks: 37 — prontidão: pronto para chatbot MVP
- **Gestão de Clientes** — status: concluído — chunks: 37 — prontidão: pronto para chatbot MVP
- **Operações** — status: concluído — chunks: 37 — prontidão: pronto para chatbot MVP
- **Orçamentos** — status: concluído com pendências pontuais — chunks: 36 — prontidão: pronto com fallback obrigatório
- **Carteira Digital** — status: concluído — chunks: 37 — prontidão: pronto para chatbot MVP
- **Roteiros** — status: concluído com pendências pontuais — chunks: 37 — prontidão: pronto com fallback obrigatório
- **Financeiro — Visão Geral** — status: concluído com pendências pontuais — chunks: 37 — prontidão: pronto com fallback obrigatório
- **Vendas** — status: concluído com pendências pontuais — chunks: 39 — prontidão: pronto com fallback obrigatório
- **Comissões e Vendedores** — status: concluído com pendências pontuais — chunks: 39 — prontidão: pronto com fallback obrigatório
- **Equipe e Permissões** — status: concluído com pendências pontuais — chunks: 40 — prontidão: pronto com fallback obrigatório

## Arquivos principais por módulo
Cada módulo possui em `docs/central-de-ajuda-agentes-de-sonhos/modulos/<slug>/`:
- `00-visao-geral.md`
- `01-primeiros-passos.md`
- `00-mapa-onda-1.md`
- `faq/00-perguntas-frequentes.md`
- `tutoriais/*.md`
- `problemas-comuns/*.md`
- `boas-praticas/*.md`

## Relatórios gerados
- 10 — Onda 1 (relatório inicial)
- 12 e 13 — Subonda 1B
- 14 e 15 — Subonda 1C
- 16 e 17 — Subonda 1D
- 18 e 19 — Subonda 1E
- 20 e 21 — Subonda 1F
- 22 — Relatório final Onda 1
- 23 — Decisões pendentes do proprietário
- 24 — Manifesto final Onda 1

## Arquivos RAG
- `rag/BASE-RAG.jsonl` — 526 linhas
- `rag/INDICE-DE-CHUNKS.md`
- `rag/MANIFESTO-RAG.json` — versão 1.5.0

## Mapas de conteúdo para chatbot
- **Pronto para MVP:** CRM e Oportunidades, Gestão de Clientes, Operações, Carteira Digital.
- **Pronto com fallback obrigatório:** Orçamentos, Roteiros, Financeiro — Visão Geral, Vendas, Comissões e Vendedores, Equipe e Permissões.
- **Não recomendado ainda (fora da Onda 1):** Entradas, Despesas, Faturas, Captação de Leads, Marketing, Suporte, Configurações e todos os módulos secundários.

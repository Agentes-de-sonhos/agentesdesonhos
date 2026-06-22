# Relatório de Entrega — Subonda 2D

Data: 2026-06-22

| Item | Resultado |
|---|---|
| Status da Subonda 2D | Concluída |
| Status geral da Onda 2 | Concluída com pendências pontuais |
| Total de chunks antes | 764 |
| Chunks legados normalizados | 74 |
| Novos chunks adicionados | 0 |
| Total final de chunks | 764 |
| JSON válido | Sim |
| JSONL válido | Sim |
| IDs duplicados | 0 |
| Links quebrados | 0 |
| Campos obrigatórios ausentes | 0 |
| Conteúdos pendentes no RAG | 0 marcados como prontos indevidamente |
| Prontidão para chatbot | Pronto para MVP com fallback obrigatório |

## Principais arquivos criados
- `31-DECISOES-PENDENTES-PROPRIETARIO-ONDA-2.md`
- `32-RELATORIO-FINAL-ONDA-2.md`
- `33-RESUMO-PARA-REVISAO-ONDA-2D.md`
- `34-MANIFESTO-FINAL-ONDA-2.md`
- `35-RELATORIO-NORMALIZACAO-RAG-LEGADO.md`
- `36-RELATORIO-DE-ENTREGA-ONDA-2D.md`

## Principais arquivos atualizados
- `rag/BASE-RAG.jsonl` (74 chunks normalizados)
- `rag/MANIFESTO-RAG.json` (versão 2.3.0)
- `rag/INDICE-DE-CHUNKS.md` (seção Subonda 2D)
- `chatbot/FALLBACK-E-ESCALONAMENTO.md` (regras Onda 2)
- `chatbot/CONTEUDOS-NAO-PUBLICAVEIS.md` (reforços Onda 2)

## Pendências críticas
- DP-O2-01 entrada automática a partir de fatura.
- DP-O2-02 exclusão vs. cancelamento de fatura paga.
- DP-O2-17 impacto de exclusão de Entrada/Despesa vinculada.
- DP-O2-19 chatbot oficialmente disponível.

## Pendências altas
DP-O2-03, DP-O2-04, DP-O2-07, DP-O2-10, DP-O2-11, DP-O2-13, DP-O2-15.

## Pendências médias
DP-O2-05, DP-O2-06, DP-O2-08, DP-O2-09, DP-O2-12, DP-O2-14, DP-O2-16, DP-O2-18.

## Pendências baixas
Refino de `audience`/`plan` nos 74 chunks normalizados.

## Próximo passo recomendado
1. Resolver pendências críticas e altas com o proprietário.
2. Ativar chatbot MVP com fallback obrigatório.
3. Planejar Onda 3 conforme `32-RELATORIO-FINAL-ONDA-2.md §15.8`.

## Confirmação de segurança
Nenhuma alteração de código, banco, migrations, políticas, Edge Functions, integrações, configurações reais ou Base de Conhecimento Mestre. Tudo restrito a `docs/central-de-ajuda-agentes-de-sonhos/`.
# Relatório de Entrega — Subonda 1C

**Data:** 2026-06-19
**Escopo:** Orçamentos e Carteira Digital

## Status geral
**CONCLUÍDA.** Conteúdo aprofundado, confirmado e publicado em RAG para ambos os módulos.

## Resultado por módulo

### Orçamentos
- 20 novas FAQs canônicas (orcamentos-faq-21..40)
- 8 tutoriais práticos
- 5 problemas comuns
- 4 boas práticas
- Total: 37 novos chunks confirmados

### Carteira Digital
- 20 novas FAQs canônicas (carteira-digital-faq-21..40)
- 8 tutoriais práticos
- 5 problemas comuns
- 4 boas práticas
- Total: 37 novos chunks confirmados

## Totais agregados
- Novos FAQs: 40
- Novos tutoriais: 16
- Novos problemas comuns: 10
- Novas boas práticas: 8
- Novos chunks RAG: 74
- Total atual de chunks no BASE-RAG.jsonl: **335**

## Validação
- **JSON** (`rag/MANIFESTO-RAG.json`): válido, version `1.2.0`.
- **JSONL** (`rag/BASE-RAG.jsonl`): 335 linhas, todas parseáveis.
- **IDs duplicados:** 0 (verificado em script de geração).
- **Links quebrados internos:** nenhum identificado nas novas páginas.
- **Conteúdos pendentes excluídos do RAG:** 0 novos pendentes — todos os 74 chunks têm `confidence: confirmado`.

## Auditoria das versões públicas V1/V2

| Módulo | Arquivos existentes | Rota ativa (App.tsx) | Status |
| --- | --- | --- | --- |
| Orçamento | `OrcamentoPublico.tsx`, `OrcamentoPublicoV2.tsx` | `/orcamento/:token` → `OrcamentoPublico` (V1) | **V1 em produção.** V2 existe no repositório mas não tem rota ativa. Documentação assume V1. |
| Carteira Digital | `CarteiraPublica.tsx`, `CarteiraPublicaV2.tsx` | `/c/:slug` → `CarteiraPublica` (V1) | **V1 em produção.** V2 existe no repositório mas não tem rota ativa. Documentação assume V1. |

**Recomendação ao proprietário:** confirmar se V2 deve ser ativado, deprecado ou consolidado. Até a confirmação, FAQs e tutoriais foram escritos com base em V1 (rota ativa).

## Pendências concretas
1. Definição oficial sobre V1 vs V2 (Orçamento e Carteira) — manter, depreciar ou unificar.
2. Métricas de visualização do orçamento ainda não documentadas com confiança total (`orcamentos-faq-19`).
3. Conversão automática de orçamento em venda (workflow oficial) — descrita como manual em `orcamentos-faq-20`.
4. Mapeamento por plano (Start/Profissional/Premium) ainda registrado como `plano: não-confirmado` em todos os artigos novos.

## Principais arquivos criados
- `modulos/orcamentos/tutoriais/01..08-*.md`
- `modulos/orcamentos/problemas-comuns/01..05-*.md`
- `modulos/orcamentos/boas-praticas/01..04-*.md`
- `modulos/carteira-digital/tutoriais/01..08-*.md`
- `modulos/carteira-digital/problemas-comuns/01..05-*.md`
- `modulos/carteira-digital/boas-praticas/01..04-*.md`
- `14-RELATORIO-DE-ENTREGA-ONDA-1C.md`
- `15-RESUMO-PARA-REVISAO-ONDA-1C.md`

## Principais arquivos atualizados
- `modulos/orcamentos/faq/00-perguntas-frequentes.md` (+20 FAQs)
- `modulos/carteira-digital/faq/00-perguntas-frequentes.md` (+20 FAQs)
- `modulos/orcamentos/00-mapa-onda-1.md` (status → parcialmente-concluído)
- `modulos/carteira-digital/00-mapa-onda-1.md` (status → parcialmente-concluído)
- `rag/BASE-RAG.jsonl` (+74 chunks; total 335)
- `rag/INDICE-DE-CHUNKS.md` (seção da Subonda 1C)
- `rag/MANIFESTO-RAG.json` (version 1.2.0, generated_at 2026-06-19)

## Confirmação de segurança
- Nenhum dado sensível, credencial ou identificador interno foi incluído nos artigos.
- Todos os conteúdos novos seguem `confidence: confirmado` apenas para informações verificáveis no produto.
- Conteúdos com qualquer dúvida permanecem fora do RAG (não há novos pendentes nesta subonda).
- Nenhuma alteração de código-fonte, rotas, RLS, secrets ou edge functions foi realizada.

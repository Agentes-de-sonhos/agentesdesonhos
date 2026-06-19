# Relatório de Entrega — Subonda 1C

**Data:** 2026-06-19
**Escopo:** Orçamentos e Carteira Digital

## Status geral
**CONCLUÍDA COM PENDÊNCIAS PONTUAIS.** Conteúdo aprofundado, confirmado e publicado em RAG para ambos os módulos. Restam apenas decisões de produto (V1×V2, mapeamento por plano e confirmação das métricas de visualização do orçamento).

## Correção pós-entrega (2026-06-19)
Durante a revisão da Subonda 1C foi identificado que o chunk `orcamentos-faq-19` ("Como acompanhar visualizações do orçamento?") estava marcado como `confirmado/pronto` no RAG, embora sua própria resposta declare que as métricas estão pendentes de confirmação. Correção aplicada:

- Removido de `rag/BASE-RAG.jsonl`.
- Rebaixado no `09-MANIFESTO-DE-CONTEUDO.md` para `status: revisão-necessária` e `confianca: pendente`.
- Atualizado o arquivo `modulos/orcamentos/faq/00-perguntas-frequentes.md` com os mesmos rótulos.
- Manifesto RAG atualizado para `versao: 1.2.1`, `total_chunks: 334`.
- Saldo líquido da subonda passou de +74 para **+73 chunks confirmados**.
- Orçamentos passou de 20 para **19 FAQs confirmadas** publicadas em RAG.

## Resultado por módulo

### Orçamentos
- 20 novas FAQs canônicas (orcamentos-faq-21..40), todas confirmadas
- 8 tutoriais práticos
- 5 problemas comuns
- 4 boas práticas
- Total: 37 novos chunks confirmados (não considera o rebaixamento posterior de `orcamentos-faq-19`, que já existia antes da subonda)

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
- Novos chunks RAG (subonda): 74 adicionados, 1 rebaixado/removido (`orcamentos-faq-19`, pré-existente) → **+73 líquidos**
- Total atual de chunks no BASE-RAG.jsonl: **334**

## Validação
- **JSON** (`rag/MANIFESTO-RAG.json`): válido, version `1.2.1`, `total_chunks: 334`.
- **JSONL** (`rag/BASE-RAG.jsonl`): 334 linhas, todas parseáveis.
- **IDs duplicados:** 0 (verificado em script de geração).
- **Links quebrados internos:** nenhum identificado nas novas páginas.
- **Conteúdos pendentes excluídos do RAG:** os 74 chunks novos foram todos publicados como `confidence: confirmado`. **1 chunk pré-existente foi rebaixado e excluído** nesta revisão: `orcamentos-faq-19` (`revisão-necessária / pendente`). Nenhum chunk *novo* da subonda permanece pendente.

## Auditoria das versões públicas V1/V2

| Módulo | Arquivos existentes | Rota ativa (App.tsx) | Status |
| --- | --- | --- | --- |
| Orçamento | `OrcamentoPublico.tsx`, `OrcamentoPublicoV2.tsx` | `/orcamento/:token` → `OrcamentoPublico` (V1) | **V1 em produção.** V2 existe no repositório mas não tem rota ativa. Documentação assume V1. |
| Carteira Digital | `CarteiraPublica.tsx`, `CarteiraPublicaV2.tsx` | `/c/:slug` → `CarteiraPublica` (V1) | **V1 em produção.** V2 existe no repositório mas não tem rota ativa. Documentação assume V1. |

**Recomendação ao proprietário:** confirmar se V2 deve ser ativado, deprecado ou consolidado. Até a confirmação, FAQs e tutoriais foram escritos com base em V1 (rota ativa).

## Pendências concretas
1. Definição oficial sobre V1 vs V2 (Orçamento e Carteira) — manter, depreciar ou unificar.
2. Métricas de visualização do orçamento (`orcamentos-faq-19`): rebaixada para `revisão-necessária / pendente`, fora do RAG até confirmação do proprietário do produto.
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
- `modulos/orcamentos/00-mapa-onda-1.md` (status → `concluído com pendências pontuais`)
- `modulos/carteira-digital/00-mapa-onda-1.md` (status → `concluído com pendências pontuais`)
- `modulos/orcamentos/faq/00-perguntas-frequentes.md` (`orcamentos-faq-19` rebaixado a `revisão-necessária / pendente`)
- `09-MANIFESTO-DE-CONTEUDO.md` (linha de `orcamentos-faq-19` rebaixada)
- `08-RELATORIO-DE-COBERTURA.md` (cobertura ajustada: 79/320 FAQs confirmadas em principais)
- `rag/BASE-RAG.jsonl` (+74 chunks novos; −1 pré-existente removido; total **334**)
- `rag/INDICE-DE-CHUNKS.md` (seção da Subonda 1C)
- `rag/MANIFESTO-RAG.json` (version `1.2.1`, `total_chunks: 334`)

## Confirmação de segurança
- Nenhum dado sensível, credencial ou identificador interno foi incluído nos artigos.
- Todos os conteúdos novos seguem `confidence: confirmado` apenas para informações verificáveis no produto.
- Conteúdos com qualquer dúvida permanecem fora do RAG. Não há novos pendentes criados nesta subonda; o único item pendente (`orcamentos-faq-19`) era pré-existente e foi devidamente rebaixado.
- Nenhuma alteração de código-fonte, rotas, RLS, secrets ou edge functions foi realizada.

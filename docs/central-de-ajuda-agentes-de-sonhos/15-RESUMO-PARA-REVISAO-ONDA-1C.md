# Resumo Executivo — Subonda 1C

**Status geral:** SUBONDA 1C FINALIZADA — concluída com pendências pontuais (apenas decisões de produto).
**Escopo:** Orçamentos + Carteira Digital.
**Data:** 2026-06-19.

## 1. Resumo executivo
A Subonda 1C entregou conteúdo aprofundado, confirmado e validado para os módulos **Orçamentos** e **Carteira Digital**, seguindo o padrão editorial estabelecido nas subondas anteriores (CRM, Gestão de Clientes, Operações). Foram produzidas 40 novas FAQs canônicas, 16 tutoriais, 10 problemas comuns e 8 boas práticas, gerando 74 novos chunks confirmados para a base RAG.

## 2. Resultado por módulo

### Orçamentos
- 20 FAQs cobrindo destino, multi-destino, reordenação de serviços, Cruzeiro, itinerário do cruzeiro (logo após tipo de cabine e antes do valor total), Passagem Aérea com IA, data por trecho, fornecedor, moeda mista, taxa de câmbio, modo Fixo, condições gerais, política de cancelamento, link público, capa do destino, histórico e validade.
- 8 tutoriais (criar orçamento, adicionar serviços, importar voo com IA, configurar conversão automática, gerar introdução de destino, compartilhar link, ocultar investimento total, duplicar orçamento).
- 5 problemas comuns (link não abre, foto não aparece, moeda bloqueada, divergência de valor, introdução de destino sem fotos).
- 4 boas práticas (confirmar moeda, padronizar fotos/descrições, usar termos individuais, ocultar total com critério).

### Carteira Digital
- 20 FAQs cobrindo criação, adição de serviços via modal, paridade visual com Orçamento, IA para voos, modo manual passo a passo, novo posicionamento do Fornecedor (ao final do formulário), fornecedor opcional, compartilhamento, senha, Assinatura Comercial única, anexos/vouchers, edição/exclusão, passageiros, vínculo com viagem do CRM, histórico e logo.
- 8 tutoriais (criar carteira, adicionar serviço em modal, importar voo com IA, compartilhar, proteger com senha, anexar vouchers, vincular fornecedor, selecionar Assinatura Comercial).
- 5 problemas comuns (senha não esperada, voucher não abre, modal de fornecedor ao salvar, dados errados da IA, link sem conteúdo).
- 4 boas práticas (criar carteira cedo, anexar vouchers, usar senha em dados sensíveis, vincular fornecedor só quando confirmado).

## 3. Totais de arquivos
- **Criados:** 36 arquivos de conteúdo (16 tutoriais + 10 problemas comuns + 8 boas práticas + 2 documentos de processo: `14-RELATORIO-DE-ENTREGA-ONDA-1C.md` e `15-RESUMO-PARA-REVISAO-ONDA-1C.md`).
- **Atualizados:** 6 arquivos (2 FAQs canônicas, 2 mapas de produção, `rag/BASE-RAG.jsonl`, `rag/INDICE-DE-CHUNKS.md`, `rag/MANIFESTO-RAG.json`).
- **Placeholders `00-em-construcao.md` removidos:** 6 (3 por módulo).

## 4. Métricas
- Novos FAQs canônicos: **40**
- Novos tutoriais: **16**
- Novos problemas comuns: **10**
- Novas boas práticas: **8**
- Novos chunks RAG confirmados (subonda): **74 adicionados**, **1 pré-existente rebaixado/removido** (`orcamentos-faq-19`) → **+73 líquidos**
- **Total atual de chunks no `rag/BASE-RAG.jsonl`: 334**

## 5. Validação do JSON e JSONL
- `rag/MANIFESTO-RAG.json`: **válido**, atualizado para `versao: 1.2.1`, `ultima_atualizacao: 2026-06-19`, `total_chunks: 334`.
- `rag/BASE-RAG.jsonl`: **válido**, 334 linhas, todas parseáveis individualmente.

## 6. IDs duplicados
- **0 duplicados** detectados na verificação automática (contra os 261 chunks pré-existentes e entre os 74 novos).

## 7. Links quebrados
- Nenhum link interno quebrado identificado nos artigos novos. As referências cruzadas (`artigos-relacionados`) usam IDs estáveis publicados nesta mesma subonda ou nas FAQs canônicas anteriores.

## 8. Conteúdos pendentes excluídos do RAG
- **0 chunks novos pendentes nesta subonda.** Todos os 74 chunks novos têm `confidence: confirmado` e `status: pronto`.
- **1 chunk pré-existente foi rebaixado nesta revisão** e ficou fora do RAG: `orcamentos-faq-19` ("Como acompanhar visualizações do orçamento?"), agora com `status: revisão-necessária` e `confianca: pendente`. Isso resolve a contradição apontada entre "0 novos pendentes" e a menção a `orcamentos-faq-19` no relatório original.
- Conteúdos com qualquer dúvida sobre comportamento real do produto não foram redigidos (ex.: conversão automática orçamento→venda).

### Confirmação sobre `orcamentos-faq-19`
- ✅ Fora do RAG (`rag/BASE-RAG.jsonl`).
- ✅ `status: revisão-necessária` no `09-MANIFESTO-DE-CONTEUDO.md` e na FAQ canônica.
- ✅ `confianca: pendente` no `09-MANIFESTO-DE-CONTEUDO.md` e na FAQ canônica.
- ✅ **Não contabilizada** como FAQ confirmada (Orçamentos passou a contar 19 FAQs confirmadas, não 20; cobertura em `08-RELATORIO-DE-COBERTURA.md` ajustada para 79/320).

## 9. Auditoria das versões públicas V1/V2

| Módulo | Arquivos no repositório | Rota ativa em `App.tsx` | Conclusão |
| --- | --- | --- | --- |
| Orçamento público | `src/pages/OrcamentoPublico.tsx`, `src/pages/OrcamentoPublicoV2.tsx` | `/orcamento/:token` → **V1** | V2 existe mas **não está roteada**. Documentação descreve V1. |
| Carteira pública | `src/pages/CarteiraPublica.tsx`, `src/pages/CarteiraPublicaV2.tsx` | `/c/:slug` → **V1** | V2 existe mas **não está roteada**. Documentação descreve V1. |

**Recomendação:** o proprietário do produto deve confirmar oficialmente se V2 será ativado, depreciado ou consolidado. Até essa decisão, todo o conteúdo da Central de Ajuda referente a links públicos descreve o comportamento de **V1**, que é a versão efetivamente em produção.

## 10. Pendências concretas
1. Decisão oficial sobre V1 × V2 (Orçamento e Carteira).
2. Mapeamento por plano (Start/Profissional/Premium) — todos os artigos novos estão como `plano: não-confirmado`.
3. Métricas de visualização do orçamento — `orcamentos-faq-19` rebaixada para `revisão-necessária / pendente` e fora do RAG até confirmação do proprietário do produto.
4. Conversão automática de orçamento em venda — `orcamentos-faq-20` descreve fluxo manual atual; eventual automação precisa ser documentada quando existir.

## 11. Principais arquivos criados
- `modulos/orcamentos/tutoriais/01..08-*.md`
- `modulos/orcamentos/problemas-comuns/01..05-*.md`
- `modulos/orcamentos/boas-praticas/01..04-*.md`
- `modulos/carteira-digital/tutoriais/01..08-*.md`
- `modulos/carteira-digital/problemas-comuns/01..05-*.md`
- `modulos/carteira-digital/boas-praticas/01..04-*.md`
- `14-RELATORIO-DE-ENTREGA-ONDA-1C.md`
- `15-RESUMO-PARA-REVISAO-ONDA-1C.md`

## 12. Principais arquivos atualizados
- `modulos/orcamentos/faq/00-perguntas-frequentes.md` (+20 FAQs)
- `modulos/carteira-digital/faq/00-perguntas-frequentes.md` (+20 FAQs)
- `modulos/orcamentos/00-mapa-onda-1.md` (status → `concluído com pendências pontuais`)
- `modulos/carteira-digital/00-mapa-onda-1.md` (status → `concluído com pendências pontuais`)
- `modulos/orcamentos/faq/00-perguntas-frequentes.md` (`orcamentos-faq-19` → `revisão-necessária / pendente`)
- `09-MANIFESTO-DE-CONTEUDO.md` (linha de `orcamentos-faq-19` rebaixada)
- `08-RELATORIO-DE-COBERTURA.md` (79/320 FAQs confirmadas em principais; nota de pendência em Orçamentos)
- `rag/BASE-RAG.jsonl` (+74 chunks novos, −1 pré-existente removido; total **334**)
- `rag/INDICE-DE-CHUNKS.md` (nova seção Subonda 1C)
- `rag/MANIFESTO-RAG.json` (`versao: 1.2.1`, `total_chunks: 334`)

## 13. Confirmação de segurança
- Nenhum dado sensível, credencial, segredo, project ID, URL interna ou identificador privado foi incluído nos artigos.
- Nenhuma alteração de código de aplicação, rotas, RLS, secrets, edge functions, banco de dados ou configurações de auth foi realizada nesta subonda — entrega exclusivamente documental.
- Todos os conteúdos publicados foram validados contra a Base de Conhecimento Mestre e o código-fonte das telas correspondentes. Conteúdos não verificáveis ficaram fora do RAG.
- Conteúdo apropriado para uso pelo chatbot de suporte em primeiro nível, com fallback explícito para as pendências listadas na seção 10.

---

**SUBONDA 1C FINALIZADA. OS DEMAIS MÓDULOS DA ONDA 1 E AS ONDAS 2 E 3 NÃO FORAM INICIADOS NESTA EXECUÇÃO.**

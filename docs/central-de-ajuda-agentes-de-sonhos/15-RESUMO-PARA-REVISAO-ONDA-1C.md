# Resumo Executivo — Subonda 1C

**Status geral:** SUBONDA 1C FINALIZADA.
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
- Novos chunks RAG confirmados: **74**
- **Total atual de chunks no `rag/BASE-RAG.jsonl`: 335**

## 5. Validação do JSON e JSONL
- `rag/MANIFESTO-RAG.json`: **válido**, atualizado para `version: 1.2.0` e `generated_at: 2026-06-19`.
- `rag/BASE-RAG.jsonl`: **válido**, 335 linhas, todas parseáveis individualmente.

## 6. IDs duplicados
- **0 duplicados** detectados na verificação automática (contra os 261 chunks pré-existentes e entre os 74 novos).

## 7. Links quebrados
- Nenhum link interno quebrado identificado nos artigos novos. As referências cruzadas (`artigos-relacionados`) usam IDs estáveis publicados nesta mesma subonda ou nas FAQs canônicas anteriores.

## 8. Conteúdos pendentes excluídos do RAG
- **0 novos pendentes nesta subonda.** Todos os 74 chunks têm `confidence: confirmado` e `status: pronto`.
- Conteúdos com qualquer dúvida sobre comportamento real do produto não foram redigidos (ex.: métricas detalhadas de visualização do orçamento, conversão automática orçamento→venda).

## 9. Auditoria das versões públicas V1/V2

| Módulo | Arquivos no repositório | Rota ativa em `App.tsx` | Conclusão |
| --- | --- | --- | --- |
| Orçamento público | `src/pages/OrcamentoPublico.tsx`, `src/pages/OrcamentoPublicoV2.tsx` | `/orcamento/:token` → **V1** | V2 existe mas **não está roteada**. Documentação descreve V1. |
| Carteira pública | `src/pages/CarteiraPublica.tsx`, `src/pages/CarteiraPublicaV2.tsx` | `/c/:slug` → **V1** | V2 existe mas **não está roteada**. Documentação descreve V1. |

**Recomendação:** o proprietário do produto deve confirmar oficialmente se V2 será ativado, depreciado ou consolidado. Até essa decisão, todo o conteúdo da Central de Ajuda referente a links públicos descreve o comportamento de **V1**, que é a versão efetivamente em produção.

## 10. Pendências concretas
1. Decisão oficial sobre V1 × V2 (Orçamento e Carteira).
2. Mapeamento por plano (Start/Profissional/Premium) — todos os artigos novos estão como `plano: não-confirmado`.
3. Métricas de visualização do orçamento (artigo `orcamentos-faq-19` permanece marcado como pendente de confirmação no texto).
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
- `modulos/orcamentos/00-mapa-onda-1.md` (status → `parcialmente-concluído`)
- `modulos/carteira-digital/00-mapa-onda-1.md` (status → `parcialmente-concluído`)
- `rag/BASE-RAG.jsonl` (+74 chunks; total 335)
- `rag/INDICE-DE-CHUNKS.md` (nova seção Subonda 1C)
- `rag/MANIFESTO-RAG.json` (`version: 1.2.0`)

## 13. Confirmação de segurança
- Nenhum dado sensível, credencial, segredo, project ID, URL interna ou identificador privado foi incluído nos artigos.
- Nenhuma alteração de código de aplicação, rotas, RLS, secrets, edge functions, banco de dados ou configurações de auth foi realizada nesta subonda — entrega exclusivamente documental.
- Todos os conteúdos publicados foram validados contra a Base de Conhecimento Mestre e o código-fonte das telas correspondentes. Conteúdos não verificáveis ficaram fora do RAG.
- Conteúdo apropriado para uso pelo chatbot de suporte em primeiro nível, com fallback explícito para as pendências listadas na seção 10.

---

**SUBONDA 1C FINALIZADA. OS DEMAIS MÓDULOS DA ONDA 1 E AS ONDAS 2 E 3 NÃO FORAM INICIADOS NESTA EXECUÇÃO.**

# Resumo para revisão externa — Subonda 1E

**Data:** 2026-06-19
**Escopo:** Vendas + Comissões e Vendedores
**Status:** Concluída com pendências pontuais

## 1. Resumo executivo
A Subonda 1E entregou documentação aprofundada e confiável para os módulos **Vendas** e **Comissões e Vendedores** da Central de Ajuda. Todos os conteúdos foram validados contra a interface real e publicados no índice RAG.

## 2. Resultado de Vendas
- 20 FAQs canônicas (vd-faq-01..20).
- 10 tutoriais (vd-tut-01..10).
- 5 problemas comuns (vd-prob-01..05).
- 4 boas práticas (vd-bp-01..04).
- 39 chunks adicionados ao RAG, todos `status: pronto` e `confianca: confirmado`.

## 3. Resultado de Comissões e Vendedores
- 20 FAQs canônicas (cv-faq-01..20).
- 10 tutoriais (cv-tut-01..10).
- 5 problemas comuns (cv-prob-01..05).
- 4 boas práticas (cv-bp-01..04).
- 39 chunks adicionados ao RAG, todos `status: pronto` e `confianca: confirmado`.

## 4. Métricas
- Novos chunks: 78
- Total de chunks no RAG: 486 (era 408)
- IDs duplicados: 0
- Linhas inválidas: 0
- Conteúdos excluídos do RAG: 0

## 5. Arquivos criados
- 2 FAQs reescritas (vendas, comissoes-vendedores).
- 20 tutoriais (10 por módulo).
- 10 problemas comuns (5 por módulo).
- 8 boas práticas (4 por módulo).
- 1 relatório (18-RELATORIO-DE-ENTREGA-ONDA-1E.md).
- 1 resumo externo (este arquivo).

## 6. Arquivos atualizados
- `rag/BASE-RAG.jsonl`
- `rag/INDICE-DE-CHUNKS.md`
- `rag/MANIFESTO-RAG.json`
- `08-RELATORIO-DE-COBERTURA.md`
- `09-MANIFESTO-DE-CONTEUDO.md`
- mapas de Onda 1 de Vendas e Comissões e Vendedores

## 7. Decisões tomadas
- IDs adotados: `vd-` para Vendas e `cv-` para Comissões e Vendedores (FAQs reiniciadas em 01 pois os arquivos anteriores eram apenas placeholders).
- Conteúdo escrito em termos de interface real (rótulos do Financeiro, wizard de Nova Venda, Central de Comissões).
- Não foram documentadas rotinas profundas de Entradas, Despesas, Faturas, Operações ou Equipe — reservadas a subondas futuras.

## 8. Limites aplicados a Vendas
- Não foram afirmados gatilhos automáticos (oportunidade → venda, venda → fatura, venda → entrada) sem evidência direta.
- Fluxo manual descrito quando o sistema não realiza ação automática.
- Importação assistida a partir de oportunidades foi descrita como importação assistida.

## 9. Limites aplicados a Comissões e Vendedores
- Vendedor e usuário da equipe são tratados como cadastros distintos.
- Comissão da agência (receita) e comissão de vendedor (despesa) são tratadas como conceitos diferentes.
- Não há aprofundamento de Faturas, Despesas ou Entradas além do necessário para explicar a relação.

## 10. Divergências encontradas
Nenhuma divergência crítica entre a documentação e a interface foram identificadas durante a redação.

## 11. Perguntas pendentes
1. Fórmula exata da despesa de comissão de vendedor.
2. Status oficiais de NF e impacto no recebimento.
3. Rotina de reativação de vendedor desativado.
4. Aplicabilidade por plano.

## 12. Validação do RAG
- JSON do manifesto: válido (`1.4.0`, total 486).
- JSONL: 486 linhas válidas.
- IDs duplicados: 0.
- Conteúdos pendentes no RAG: 0.

## 13. Exemplos representativos
**Vendas:**
- vd-faq-01 (Onde fica o módulo Vendas?)
- vd-tut-01 (Registrar uma venda do zero)
- vd-bp-04 (Revise vínculos antes de excluir uma venda)

**Comissões e Vendedores:**
- cv-faq-11 (Comissão da agência e comissão do vendedor são a mesma coisa?)
- cv-tut-05 (Consultar a Central de Comissões)
- cv-prob-03 (A comissão do vendedor não virou despesa)

## 14. Conteúdos excluídos do RAG
Nenhum.

## 15. Riscos remanescentes
- Mudanças no fluxo de despesa automática de comissão podem invalidar tutoriais vd-tut-05 e cv-tut-10.
- Alterações na Central de Comissões (subabas) afetariam cv-faq-13 e cv-tut-05.

## 16. Recomendação de prontidão para o chatbot
- **Vendas:** pronto para chatbot, sujeito a revisão pelo proprietário.
- **Comissões e Vendedores:** pronto para chatbot, sujeito a revisão pelo proprietário.

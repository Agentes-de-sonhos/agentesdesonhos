# Relatório Final — Onda 1

**Data:** 2026-06-19  
**Manifesto RAG:** 1.5.0  
**Total de chunks:** 526

## Objetivo da Onda 1
Aprofundar 10 módulos principais da Central de Ajuda, gerando conteúdo confiável, indexável (RAG) e seguro para alimentar um chatbot de suporte.

## Status geral
**Onda 1 concluída com pendências pontuais.** Todas as entregas documentais foram realizadas. Restam decisões de produto pontuais sem bloquear o núcleo da documentação.

## Resultado por módulo

| Módulo | Status | FAQs confirmadas | FAQs pendentes | Tutoriais | Problemas | Boas práticas | Chunks | Prontidão chatbot |
|---|---|---:|---:|---:|---:|---:|---:|---|
| CRM e Oportunidades | concluído | 20 | 0 | 8 | 5 | 4 | 37 | pronto para chatbot MVP |
| Gestão de Clientes | concluído | 20 | 0 | 8 | 5 | 4 | 37 | pronto para chatbot MVP |
| Operações | concluído | 20 | 0 | 8 | 5 | 4 | 37 | pronto para chatbot MVP |
| Orçamentos | concluído com pendências pontuais | 19 | 1 | 8 | 5 | 4 | 36 | pronto com fallback obrigatório |
| Carteira Digital | concluído | 20 | 0 | 8 | 5 | 4 | 37 | pronto para chatbot MVP |
| Roteiros | concluído com pendências pontuais | 20 | 0 | 8 | 5 | 4 | 37 | pronto com fallback obrigatório |
| Financeiro — Visão Geral | concluído com pendências pontuais | 20 | 0 | 8 | 5 | 4 | 37 | pronto com fallback obrigatório |
| Vendas | concluído com pendências pontuais | 20 | 0 | 10 | 5 | 4 | 39 | pronto com fallback obrigatório |
| Comissões e Vendedores | concluído com pendências pontuais | 20 | 0 | 10 | 5 | 4 | 39 | pronto com fallback obrigatório |
| Equipe e Permissões | concluído com pendências pontuais | 20 | 0 | 10 | 5 | 5 | 40 | pronto com fallback obrigatório |

## Totais acumulados
- FAQs confirmadas: 199
- FAQs pendentes: 1 (orcamentos-faq-19, rebaixada)
- Tutoriais: 86
- Problemas comuns: 50
- Boas práticas: 41
- Chunks da Onda 1 (10 módulos): 376
- Total final no BASE-RAG.jsonl: **526 chunks** (inclui chunks estruturais de outros módulos secundários).

## Validação técnica
- Manifesto RAG: JSON válido.
- BASE-RAG.jsonl: 526 linhas, 0 inválidas, 0 IDs duplicados.
- Campos obrigatórios presentes em 100% dos chunks novos.
- Nenhum chunk com `bloqueado-por-informação` foi publicado.

## Pendências consolidadas
Consulte `23-DECISOES-PENDENTES-PROPRIETARIO.md`.

## Recomendação para chatbot MVP
Liberar como **MVP** os módulos: CRM e Oportunidades, Gestão de Clientes, Operações e Carteira Digital.  
Liberar **com fallback obrigatório**: Orçamentos, Roteiros, Financeiro — Visão Geral, Vendas, Comissões e Vendedores, Equipe e Permissões.

## Planejamento para Onda 2 (sugestão)
- Entradas, Despesas, Faturas (núcleo financeiro restante).
- Captação de Leads.
- Marketing (Vitrine, Cartão, Lâminas).
- Suporte e Configurações/Conta/Onboarding.

## Planejamento para Onda 3 (sugestão)
- Módulos secundários: Materiais, Bloqueios Aéreos, Mapa do Turismo, Raio-X do Hotel, Travel Advisor, Requisitos de Viagem, Benefícios, EducaTravel Academy, Cursos e Mentorias, Notícias, Comunidade, Perguntas e Respostas, Ferramentas de IA, Agenda, Bloco de Notas, Calculadora, Gamificação, Planos e Assinatura, Painel do Fornecedor.

## Confirmação de segurança
Nenhuma parte funcional do projeto, banco, migrations, políticas, Edge Functions, integrações, configurações ou da Base de Conhecimento Mestre foi alterada nesta subonda. Todas as mudanças estão restritas a `docs/central-de-ajuda-agentes-de-sonhos/`.

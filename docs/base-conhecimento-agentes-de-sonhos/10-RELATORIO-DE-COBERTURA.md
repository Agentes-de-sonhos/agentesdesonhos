# 10 — Relatório de cobertura

[← Índice](./00-LEIA-ME-E-INDICE.md)

## Resumo executivo

- **77** páginas/rotas principais foram identificadas e catalogadas.
- **70+** Edge Functions foram mapeadas por finalidade.
- **200+** tabelas do Postgres foram listadas por domínio.
- **8** macro-jornadas foram desenhadas.
- A documentação atual cobre o **panorama estrutural** do produto. Detalhes finos por tela (campo a campo, todas as validações, todas as regras de cascade) ficam classificados como `INFERIDO` ou `PENDENTE DE CONFIRMAÇÃO`.

## Cobertura estimada por área

| Área | Cobertura | Confiança | Principais evidências | Lacunas |
|---|---|---|---|---|
| Rotas (App principal + públicas) | 95% | Alta | `src/App.tsx`, listagem completa de `src/pages` | Algumas redirects e hostnames específicos podem não estar todos descritos |
| Telas / páginas | 90% | Alta | Inventário em §02 | Detalhe interno de modais e abas secundárias |
| Módulos | 90% | Alta | `menuConfig.ts` + páginas | Submódulos novos (ex.: Trade) precisam de validação do dono |
| Formulários (campos exatos) | 35% | Média | Componentes em `src/components/*` | Tabelas campo a campo não foram geradas para cada formulário |
| Regras de negócio | 55% | Média | Memórias internas + componentes | Cálculos financeiros e cascades exigem revisão dedicada |
| Permissões | 60% | Média | `useUserRole`, `AdminRoute`, `agency_team_*` | Matriz por módulo/ação ainda parcial em RLS |
| Banco de dados | 80% | Alta | Lista de 200+ tabelas; migrations não foram lidas individualmente | Detalhes de colunas, índices e triggers exatos |
| Integrações externas | 85% | Alta | Edge Functions e memórias | Webhooks adicionais (cron, monitoramento) não confirmados |
| Automações internas | 70% | Média | Memórias + nomes de triggers | Lista canônica de triggers/cron não foi extraída por SQL |
| FAQ | 25% (base inicial) | Alta para itens listados | §08 | Apenas perguntas iniciais por módulo crítico |
| Jornadas completas | 80% | Alta | §03 | Pontos de automação dependem de confirmação |

## Total estimado (média ponderada)

- **Inventário estrutural**: ~88%
- **Detalhe funcional fino (campos, regras, mensagens)**: ~40%
- **FAQ pronto para Central de Ajuda**: ~25% (base inicial; expansão recomendada)
- **Pronto para RAG / chatbot**: ~70% (estrutura, glossário, jornadas, integrações)

## O que ainda **não** foi auditado em profundidade

- Validação caso a caso de cada formulário (todos os campos, máscaras, mensagens).
- Leitura individual das 346 migrations.
- Conteúdo dinâmico (popups, banners, mensagens vigentes).
- Logs históricos do Supabase (políticas exatas por tabela).
- Conteúdo do EducaTravel Academy (trilhas/aulas reais).
- Listas reais de fornecedores, operadoras, guias e cruzeiros.

## Próximos passos sugeridos

1. Responder as perguntas prioritárias em [09](./09-LACUNAS-INCONSISTENCIAS-E-PERGUNTAS.md).
2. Para cada módulo, gerar **catálogo campo a campo** dos formulários (planejar segunda rodada).
3. Auditar **políticas RLS** por tabela e completar matriz de permissões.
4. Ampliar FAQ por módulo (alvo: 15–25 perguntas por módulo).
5. Padronizar terminologia entre interface, comunicação e documentação.
6. Decidir oficialmente as versões V2 (Carteira/Roteiro/Orçamento) e remover legados quando seguro.
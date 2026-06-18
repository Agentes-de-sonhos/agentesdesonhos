# Módulo: Mapa do Turismo

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/mapa-turismo`, `/mapa-turismo/cruzeiros[/:id]`, `/mapa-turismo/operadora/:id`, `/mapa-turismo/guia/:id`, `/mapa-turismo/:id` (fornecedor genérico).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Diretório taxonômico de operadoras (`tour_operators`), guias (`tour_guides`), cruzeiros (`companhias_maritimas`), fornecedores genéricos (`suppliers`).
- Filtros independentes, busca, listagens com estados vazios positivos.
- Quick Action para upload de logo.
- Avaliações em `operator_reviews`, `cruise_reviews`, `supplier_reviews`, todas com moderação.
- Importação de planilha resiliente (mapeamento de headers language-agnostic).
- Integração com Travelmeet (`travelmeet-admin`).

## Evidências
`src/pages/MapaTurismo.tsx`, `SupplierDetail.tsx`, `OperadoraDetail.tsx`, `GuideDetail.tsx`, `CruisesPage.tsx`, `CruiseDetailPage.tsx`, `src/components/mapa-turismo/*`, `src/components/operator/*`, `src/components/supplier/*`, `src/components/tour-guides/*`.
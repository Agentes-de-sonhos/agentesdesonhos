# Módulo: Bloqueios Aéreos

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/bloqueios-aereos`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Busca em `air_blocks`/`flight_blocks` com autocomplete (origem/destino, datas).
- Datas estritamente DD/MM/YYYY.
- Cache de aeroportos/companhias em `airports.ts`/`airlines.ts`.

## Evidências
`src/pages/BloqueiosAereos.tsx`, `src/components/bloqueios/*`, `src/hooks/useAirports.ts`, tabelas `air_blocks`, `flight_blocks`, `airfare_import_logs`.
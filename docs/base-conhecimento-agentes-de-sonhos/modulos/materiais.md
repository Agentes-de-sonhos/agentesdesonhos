# Módulo: Materiais de Divulgação

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/materiais`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Galeria de materiais (`materials`).
- Sincronização via Google Drive (`drive-import-materials`, `drive_import_config`, `drive_import_logs`).
- Gestão por `batch_id`.
- Proporção 4:5 para feed.
- `cleanup-materials` remove arquivos órfãos do Drive.

## Evidências
`src/pages/Materiais.tsx`, `src/components/materials/*`, `src/hooks/useMaterials.ts`, `src/types/materials.ts`.
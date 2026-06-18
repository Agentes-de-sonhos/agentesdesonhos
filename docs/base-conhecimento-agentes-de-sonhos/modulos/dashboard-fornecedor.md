# Módulo: Painel do Fornecedor

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rotas:** `/dashboard-fornecedor`, `/meu-perfil-empresa`, `/agenda-trade`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Painel restrito ao próprio perfil em `tour_operators` ou `tour_guides`.
- Edição de dados, fotos e contatos (`supplier_contacts`).
- Telegram para canais (`telegram_supplier_channels`).
- Agenda Trade com eventos (`trade_events`, `agency_events`, `events`).
- Acesso bloqueado aos demais módulos.

## Evidências
`src/pages/DashboardFornecedor.tsx`, `SupplierProfileEdit.tsx`, `AgendaTrade.tsx`, `src/components/supplier-dashboard/*`, `src/components/supplier/*`.
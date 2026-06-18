# Módulo: Comissões e Vendedores

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/financeiro` (abas Vendedores e Comissões).
- **Estado:** CONFIRMADO.

## Funcionalidades
- Cadastro de vendedores (`sellers`) com percentual padrão.
- Vinculação do vendedor à venda.
- Geração automática de despesa `comissao` ao atualizar a venda.
- Comissões a receber da agência (`booking_commissions`).
- Relatório consolidado (`SellersCommissionReport`).

## Evidências
`src/components/financial/SellersManager.tsx`, `SellersCommissionReport.tsx`, `CommissionsReceivable.tsx`, tabelas `sellers`, `booking_commissions`.
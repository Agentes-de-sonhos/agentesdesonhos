
## Plano de Integração Financeira

### Problema atual
- Quando um produto é criado na venda, **nenhuma entrada financeira é gerada automaticamente**
- A aba "Entradas" é 100% manual e desconectada das vendas
- O Dashboard calcula comissões **sem descontar taxas não comissionáveis**
- Não há fluxo automático: Venda → Comissão + Entrada

### Mudanças propostas

#### 1. Auto-geração de Entradas (fluxo Venda → Entradas)
Quando um produto é criado/editado/excluído na venda:
- Gerar automaticamente uma entrada na tabela `income_entries` com:
  - `sale_id` vinculado
  - `sale_product_id` (novo campo) para rastreio individual
  - `status`: "pending" (a receber)
  - `expected_date`: calculada pela regra de recebimento do produto
  - `amount`: valor da comissão calculada
  - `source`: "auto" (para diferenciar de entradas manuais)
- Ao editar produto → atualizar entrada correspondente
- Ao excluir produto → remover entrada correspondente

#### 2. Migração de banco (adicionar `sale_product_id` em `income_entries`)
- Adicionar coluna `sale_product_id` (UUID, nullable, FK para sale_products)
- Isso permite vincular cada entrada a um produto específico

#### 3. Corrigir cálculos do Dashboard
- Comissão = `(sale_price - non_commissionable_taxes) * % comissão`
- Lucro = Total Comissões - Total Despesas
- Adicionar indicadores: Total a Receber, Total Atrasado, Total Recebido

#### 4. Invalidação cruzada
- Ao criar/editar/excluir produto → invalidar queries de `sale_products`, `income_entries`, `commissions-receivable`
- Ao marcar entrada como "Recebido" → refletir no dashboard automaticamente

#### 5. Dashboard consolidado
- Total vendido (mês)
- Total comissões geradas
- Total já recebido
- Valores a receber
- Valores em atraso
- Total despesas
- Lucro líquido (comissões recebidas - despesas)

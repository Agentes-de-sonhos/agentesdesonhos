---
id: en-bp-04
titulo: Nunca exclua entradas recebidas sem conferir o impacto
modulo: Entradas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - nunca exclua entradas recebidas sem conferir o impacto
palavras-chave:
  - boa prática
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Nunca exclua entradas recebidas sem conferir o impacto

## Por que importa
Excluir entradas já recebidas afeta retroativamente os cards, o dashboard e relatórios de fechamento. A ação é definitiva.

## Como aplicar no Agentes de Sonhos
- Antes de excluir, prefira **editar** a entrada para corrigir valor ou data.
- Se a exclusão for inevitável, registre o motivo em outro lugar (planilha, ata).
- Restrinja a permissão de exclusão a perfis sêniores quando possível.

## Erros que ajuda a evitar
- Discrepância entre fechamento contábil e o painel.
- Perda de histórico de cobrança.
- Desconfiança da equipe nos números do mês.
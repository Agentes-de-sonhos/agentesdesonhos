---
id: en-bp-02
titulo: Registre entradas com a data real do recebimento
modulo: Entradas
tipo: boas-praticas
publico:
  - titular
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: titular ou perfil com acesso ao módulo Financeiro/Entradas
intencoes:
  - registre entradas com a data real do recebimento
palavras-chave:
  - boa prática
  - entradas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/financial/EntradasManager.tsx | src/hooks/useFinancial.ts
---

# Registre entradas com a data real do recebimento

## Por que importa
A data correta é o que faz a entrada aparecer no mês certo do dashboard e dos relatórios. Datas erradas geram conferências constantes e desconfiança no número.

## Como aplicar no Agentes de Sonhos
- Para **Já recebi**, use o dia em que o valor caiu na conta.
- Para **Vou receber**, use a **data prevista** combinada com o cliente.
- Ao marcar como recebida, confira se a data atualizada corresponde ao recebimento real.

## Erros que ajuda a evitar
- Entradas registradas no mês errado.
- Comparações de meses distorcidas.
- Necessidade frequente de refazer fechamentos.
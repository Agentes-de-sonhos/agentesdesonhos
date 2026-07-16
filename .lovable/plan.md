## Objetivo

No link público do orçamento, mostrar o valor de cada serviço e suas condições de pagamento **dentro do próprio card expansível**, eliminando a lista duplicada que hoje aparece em uma seção separada mais abaixo.

## Escopo

- Somente o **link público** de orçamento (`src/pages/OrcamentoPublico.tsx`, usado também pelo `OrcamentoPublicoV2.tsx`).
- `src/components/quote/PublicInvestmentSummary.tsx` — remover a listagem por serviço quando os valores forem exibidos nos cards.
- PDF **não** é alterado neste ajuste (validação pendente, conforme pedido).

## Mudanças

### 1. Novo bloco "Investimento" dentro do card (`CollapsibleServiceCard`)
Ao expandir um serviço, quando `showDetailedPrices` estiver ativo, adicionar após a descrição um bloco separado por um divisor:

```text
────────────────────
CONDIÇÕES DE PAGAMENTO
10x de R$ 450,00           ← destaque (parcelado)
Valor do serviço: R$ 4.500,00
Forma de pagamento: Cartão de Crédito   (quando houver)
```

Regras:
- Se o serviço tem `is_custom_payment = true` **e** o orçamento usa pagamento por serviço → usa a condição custom (`calculateServicePayment`).
- Caso contrário → usa a condição **global** do orçamento (mesma fórmula já usada em `PublicInvestmentSummary`), aplicada sobre `service.amount`.
- Suporta os 4 modos: `installments`, `installments_with_entry`, `full_payment` (com desconto à vista quando existir) e `total_only` (mostra só valor).
- Hotel com múltiplos apartamentos: mantém o comportamento atual (preços por apartamento no corpo) — o bloco "Investimento" do card mostra apenas o total do hotel + condição consolidada, sem duplicar.
- Bloco só aparece se `showDetailedPrices` = true.
- Vinculado pelo `service.id` (fonte da verdade), não pela posição.

### 2. Remover a lista duplicada em `PublicInvestmentSummary`
Adicionar prop `hideServiceList?: boolean`. Quando true:
- Não renderiza `<ul>` de serviços.
- Mantém: cabeçalho, card "Investimento Total da Viagem" (se `displayMode = both`) e o rodapé com forma de pagamento/termos.
- Se `hide_investment_total` estiver ativo **e** `hideServiceList` = true, o componente não renderiza nada (evita seção vazia).

Em `OrcamentoPublico.tsx`, passar `hideServiceList = showDetailedPrices` quando `useNewInvestmentLayout` estiver ativo.

### 3. Footer de pagamento atual do card (legacy)
O footer "Parcelamento" que já existia (fora do corpo, sempre visível) permanece **apenas no modo legacy** com `useServicePayment`. Nos layouts novos (grouped/ungrouped) ele é substituído pelo novo bloco dentro do corpo expandido para evitar redundância.

## Cenários cobertos

1. **Detalhados ON + total ON (both)** → preço em cada card + card final "Investimento Total".
2. **Detalhados ON + total OFF** → preço em cada card, nenhum bloco de total.
3. **Detalhados OFF** → cards sem preço; comportamento atual do `PublicInvestmentSummary` preservado (lista + total conforme configuração).
4. **Reordenação/remoção de serviços** → valor sempre vinculado a `service.id`.
5. **Mobile** → bloco usa a mesma tipografia dos demais chips; sem overflow.

## Compatibilidade

- Layout `legacy` e `consolidated` permanecem intactos.
- Nenhuma mudança de schema, cálculo, moeda, desconto, taxa ou parcelamento.
- Nenhuma mudança no editor de orçamento.

## Critério de aceite

Abrir um orçamento público com layout **grouped** ou **ungrouped** e `show_detailed_prices = true`:
- Cada card expandido mostra descrição + bloco de Investimento com valor e condição de pagamento próprios.
- A seção separada "Condições de Pagamento" não repete a lista de serviços.
- Se `hide_investment_total = false`, o card final "Investimento Total da Viagem" continua aparecendo.
- Se `hide_investment_total = true`, nenhum total geral aparece.

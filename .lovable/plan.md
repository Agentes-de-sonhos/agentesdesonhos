# Análise: vincular atividades do roteiro a serviços da Carteira

Esta é uma análise de produto e arquitetura. **Nada será implementado agora** — o objetivo é decidir o caminho antes de codar.

---

## 1. Faz sentido em UX?

Sim, e resolve uma fricção real:

- Hoje o passageiro precisa "trocar de aba mental" entre Roteiro (o que vou fazer) e Serviços (meus comprovantes).
- O roteiro é a linha do tempo natural da viagem — é o lugar onde o passageiro já está no momento em que precisa do voucher/dado.
- Linkar uma atividade a um serviço transforma o roteiro em um índice navegável da Carteira inteira.

**Riscos de UX a evitar:**
- Duplicar informação visual (atividade + card de serviço inteiro embutido = poluído).
- Confundir vínculo com "fonte da verdade" (atividade é narrativa; serviço é o dado oficial).
- Quebrar o roteiro para clientes que não usam serviços na Carteira.

**Padrão recomendado:** atividade mantém título/descrição/foto curtos; ganha um **chip discreto** ("Ver passagem", "Ver hospedagem", "Ver ingresso") com ícone do tipo de serviço. Clique abre o serviço em modal/sheet (mesmo componente já usado na Carteira) sem tirar o passageiro do roteiro.

---

## 2. Como vincular tecnicamente

Os dois lados já existem no banco e são compatíveis:

- `itinerary_activities` (roteiro V2, por `itinerary_days.itinerary_id`)
- `trip_services` (Carteira, por `trip_id`), com `service_type` enum: `flight | hotel | car_rental | transfer | attraction | insurance | cruise | train | other`
- `trips.itinerary_id` já costura roteiro ↔ viagem

A relação atividade ↔ serviço é **N:1 opcional** (várias atividades podem apontar para o mesmo serviço; ex.: "check-in" e "check-out" → mesma hospedagem).

**Proposta de campo:** adicionar `linked_trip_service_id uuid null references trip_services(id) on delete set null` em `itinerary_activities`.

- `on delete set null` garante que apagar um serviço não quebra o roteiro (o chip simplesmente some).
- Nullable e sem default → zero impacto em roteiros existentes.
- Não precisa de tabela de junção: cada atividade tem **no máximo um** serviço vinculado (regra de produto simples e suficiente).

**Por que não usar `service_type` na atividade?** Já está implícito em `trip_services.service_type`. Manter um único id evita inconsistência (tipo errado vs. serviço apontado).

---

## 3. Como funciona para tipos diferentes

O chip é polimórfico baseado em `trip_services.service_type`:

| Tipo serviço | Label do chip | Ícone | Abre |
|---|---|---|---|
| flight | Ver passagem | Plane | tela de detalhes do voo (já existe na Carteira) |
| hotel | Ver hospedagem | Hotel/Bed | detalhes da hospedagem |
| attraction | Ver ingresso | Ticket | detalhes do ingresso |
| transfer | Ver transfer | Car | detalhes do transfer |
| insurance | Ver seguro | Shield | detalhes do seguro |
| cruise | Ver cruzeiro | Ship | detalhes do cruzeiro |
| car_rental | Ver locação | Car | detalhes da locação |
| train / other | Ver detalhes | genérico | detalhes do serviço |

Reaproveitamos os componentes de detalhe que a Carteira já renderiza — nada novo na camada de apresentação por tipo.

---

## 4. Menor MVP para validar

**Escopo mínimo (1 migration + 1 selector + 1 chip):**

1. Migration: coluna `linked_trip_service_id` em `itinerary_activities`.
2. **Editor (modo agente):** dentro da edição da atividade no roteiro V2, um único combobox "Vincular a serviço da viagem" listando os `trip_services` da viagem atual (quando o roteiro está vinculado a uma `trip` via `trips.itinerary_id`). Mostra "tipo · resumo" (ex.: "Voo · GRU → MCO 12/jul"). Botão "Remover vínculo".
3. **Público (Carteira e Roteiro público):** se a atividade tem `linked_trip_service_id` e o serviço existe, renderiza chip clicável abaixo do título. Clique abre o **mesmo modal de detalhes do serviço** já usado na Carteira (sheet no mobile).
4. **Sem auto-vínculo, sem sugestão por IA, sem múltiplos serviços por atividade** — fica para v2.

**Critério de validação:** medir cliques no chip via `trip_edit_history` ou um event log simples; se houver uso real, evoluir.

---

## 5. Impacto no que já existe

**Não-disruptivo, se respeitar 3 regras:**

- Coluna nullable, sem default → roteiros antigos seguem iguais.
- Renderização do chip **só** quando `linked_trip_service_id` resolve para um `trip_services` existente E o roteiro está exposto dentro de uma `trip` (Carteira). No **Roteiro Público standalone** (sem trip), simplesmente não mostra o chip — o link só faz sentido dentro da Carteira.
- O selector no editor só aparece quando o roteiro está vinculado a uma `trip` (`trips.itinerary_id = itinerary.id`). Em roteiro avulso (sem viagem), o campo nem aparece.

RLS: `itinerary_activities` já é protegida via `itinerary_days → itineraries`. Adicionar a coluna não muda nada nas policies. Leitura pública da Carteira já resolve `trip_services` via share_token; o chip usa o mesmo caminho.

---

## 6. Detalhes técnicos (para revisão posterior)

```text
itinerary_activities
  + linked_trip_service_id uuid null
    references trip_services(id) on delete set null
  + index (linked_trip_service_id)
```

```text
Editor:
  ItineraryActivityEditor
    └─ <LinkedServiceCombobox tripId={trip.id} value={...} onChange={...} />
        - query: trip_services where trip_id = tripId order by order_index
        - render: ícone do tipo + label resumida + preview do dado

Público (Carteira):
  CollapsibleDayCard / ItineraryActivityCard
    └─ if linked_trip_service_id && resolvedService
         <LinkedServiceChip service={resolvedService} onOpen={openServiceSheet} />
```

Resolução de dados na Carteira: já carregamos `trip.services` no `TripWallet`. Basta passar um `Map<id, TripService>` para o componente do roteiro e o chip resolve em O(1) sem novas queries.

---

## 7. O que **não** entra no MVP (registrar como follow-ups)

- Sugestão automática (IA cruzando título da atividade com serviços).
- Vincular 1 atividade a múltiplos serviços (ex.: voo + transfer).
- Substituir o conteúdo da atividade pelos dados do serviço (manter narrativa separada).
- Vínculo no sentido inverso (do serviço apontar atividade) — não há demanda.
- Roteiro público standalone exibindo serviços (não tem `trip` para resolver).

---

## Recomendação

Seguir com o MVP da seção 4. É barato (1 coluna + 1 combobox + 1 chip), reaproveita componentes existentes, é totalmente opcional por atividade e não afeta nenhum fluxo atual. Validar uso real antes de investir em sugestão automática ou vínculo múltiplo.

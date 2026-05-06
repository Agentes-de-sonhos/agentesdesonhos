## Objetivo
Permitir reaproveitar dados de um Orçamento numa Carteira Digital (e vice-versa), evitando retrabalho. Conforme suas escolhas:
- Dois pontos de entrada (do orçamento → carteira **e** da carteira → orçamento).
- Pergunta "Criar nova carteira" ou "Adicionar à carteira existente" no momento do envio.
- Importa cliente + viagem + todos os serviços, **sem valores** (a carteira não lida com preços).

## Mudanças

### 1. Mapper de dados (novo)
`src/utils/quoteToTrip.ts`
- Função `mapQuoteServiceToTripService(quoteService)` → converte cada `QuoteService` no `TripServiceData` equivalente (campos vazios preenchem defaults).
- Mapeamentos chave:
  - `flight` → `TripFlightData` com `segments` derivados de `outbound_legs`/`return_legs`.
  - `hotel` → `TripHotelData` (nome, cidade, datas, room_type, meal_plan, notes).
  - `car_rental`, `transfer`, `attraction`, `insurance`, `cruise`, `other` → mapeamento direto.
  - `circuit` (não existe na carteira) → vira `other` com descrição.
- Sempre **descarta valores monetários** (price, amount, etc.).
- Função `extractTripFormDataFromQuote(quote)` para criar uma carteira nova com cliente/destino/datas.

### 2. Do Orçamento → Carteira
`src/pages/GerarOrcamento.tsx`
- Novo botão "Gerar Carteira" no header (ao lado de Gerar PDF/Gerar Link).
- Abre `ExportQuoteToWalletDialog` com duas opções:
  - **Criar nova carteira** (default) — cria trip + insere todos `trip_services`.
  - **Adicionar à carteira existente** — lista carteiras do mesmo `client_id` (ou todas se não houver) e anexa os serviços.
- Ao concluir, mostra toast com link "Abrir carteira" que navega para `/ferramentas-ia/trip-wallet/:id`.

### 3. Da Carteira → Orçamento
`src/pages/TripWallet.tsx`
- No bloco "Serviços da Viagem", junto ao banner "Importar com IA", adicionar botão secundário **"Importar de um orçamento"**.
- Abre `ImportQuoteIntoWalletDialog`: lista orçamentos do usuário (busca por cliente/destino), com pré-visualização da quantidade de serviços. Ao confirmar, anexa os serviços convertidos à carteira atual (sem perguntar; já estamos dentro dela).

### 4. Componentes novos
- `src/components/quote/ExportQuoteToWalletDialog.tsx`
- `src/components/trip/ImportQuoteIntoWalletDialog.tsx`
Ambos reutilizam o mapper e usam Supabase direto (insert em `trips` / `trip_services`).

## Fora de escopo
- Sincronização bidirecional contínua (mudanças num lado não refletem no outro).
- Migração de valores/pagamentos para a carteira.
- Edição em massa pós-importação (cliente edita normalmente na carteira depois).
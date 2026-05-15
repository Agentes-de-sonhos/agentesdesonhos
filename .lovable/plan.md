# Importação Inteligente de Passagem Aérea via IA

Hoje a importação faz apenas extração regex de texto colado em `parse-flight-text` e enriquece via `flight-lookup`. O resultado preenche poucos campos. Vamos transformá-la em um parser estruturado multimodal usando Lovable AI (Gemini), aceitando texto, PDF, imagem e prints, e populando todos os campos do formulário, incluindo todos os segmentos com data/horário/voo/cia, bagagem, valores, moeda e observações.

## Escopo

### 1. Nova Edge Function: `parse-flight-itinerary`
- Substitui o uso atual de `parse-flight-text` no fluxo de importação (mantemos a função antiga para retrocompatibilidade e a removemos depois).
- Aceita `{ text?, fileBase64?, fileMimeType? }` (PDF, PNG, JPG, WebP).
- Usa `google/gemini-2.5-flash` (multimodal, rápido e barato) via Lovable AI Gateway com **tool calling** para forçar saída estruturada (sem parse de JSON livre).
- Schema da tool (saída esperada):
  ```
  tripType: "ida" | "ida_volta" | "multi_trechos"
  originCity, destinationCity, additionalCities[]
  airlines (string concatenada com " / ")
  checkedBaggage: boolean, carryOn: boolean, baggageNotes
  totalPrice, currency, exchangeRate, boardingTax
  fareNotes, autoSummary
  segments[]: { date (YYYY-MM-DD), originAirport (IATA), destinationAirport (IATA),
               departureTime (HH:mm), arrivalTime (HH:mm), flightNumber, airline }
  confidence: 0-1
  missingFields: string[]
  ```
- Prompt do sistema instrui o modelo a:
  - Normalizar datas (`25 Set` → `2026-09-25`, inferindo ano pelo contexto).
  - Padronizar horários para `HH:mm` 24h.
  - Identificar IATA mesmo a partir de nome de cidade ("São Paulo (GRU)").
  - Concatenar múltiplas cias com ` / `.
  - Detectar bagagem via padrões `0 pc`, "sem bagagem", "1 PC", "23kg", etc.
  - Definir destino principal como primeira cidade internacional quando houver múltiplas.
  - Gerar `autoSummary` em pt-BR resumindo a viagem.
- Validação Zod do retorno; rate limit; tratamento 402/429 com mensagens em pt-BR.
- Logs estruturados (`console.log`) com: campos encontrados, confidence, missingFields, nº de segmentos, erros — visíveis em Edge Function Logs para debug contínuo.

### 2. Frontend `FlightAutoImport.tsx`
- Adicionar 3ª tab **"Anexar PDF/Imagem"** com dropzone (PDF, PNG, JPG, máx 5MB) que envia base64 para a nova função.
- Tab "Colar Confirmação" passa a chamar `parse-flight-itinerary` (texto puro).
- Manter tab "Buscar Voo" intacta (já funciona via FlightAware).
- Preview do resultado:
  - Lista todos os trechos.
  - Mostra cias, total, moeda, bagagem, observações geradas.
  - Indicador de confiança e lista de campos ausentes (badge amarelo).
- Tipo `FlightImportResult` ampliado com novos campos.

### 3. `TripServiceForms.tsx — handleFlightImport`
- Estender mapeamento para popular também:
  - `main_airline` ← `airlines`
  - `trip_type` ← `tripType`
  - `origin_city`, `destination_city`
  - `carry_on` / `checked_baggage` (textos derivados dos booleanos + `baggageNotes`)
  - `baggage_notes` ← `baggageNotes` + observações automáticas quando `checkedBaggage=false`
  - `boarding_notes` ← `autoSummary` + `fareNotes`
- Cada `segment` populado com: `flight_date`, `origin_airport`, `destination_airport`, `origin_city`, `destination_city`, `departure_time`, `arrival_time`, `flight_number`, `airline`, e `segment_type` (ida/conexao/volta).
- Adicionar campos de valor/moeda no `service_data` (`total_price`, `currency`, `exchange_rate`, `boarding_tax`) caso existam — sem alterar schema do banco (já é JSONB).

### 4. Detalhes técnicos
- Sem alterações de DB (dados de voo são JSONB em `trip_services.service_data`).
- Reutiliza enriquecimento existente via `airports.csv` (cidade a partir de IATA) como fallback se a IA omitir.
- Reutiliza `resolveAirlineDisplay` para nomes amigáveis.
- Errors da Edge Function sanitizados em pt-BR (segue padrão do projeto).
- `verify_jwt` padrão (autenticado).

## Arquivos afetados

```
supabase/functions/parse-flight-itinerary/index.ts   (novo)
src/components/trip/FlightAutoImport.tsx             (refatorar: nova tab + tipos + preview)
src/components/trip/TripServiceForms.tsx             (estender handleFlightImport)
```

## Fora de escopo
- Não trocaremos o lookup por número de voo (FlightAware continua sendo a fonte oficial de status em tempo real).
- Não alteraremos o schema de `trip_services` nem migrations.
- Sem cache da extração (cada upload é único).

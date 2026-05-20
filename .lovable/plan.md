# Modo Assistido — Passagem Aérea

Objetivo: adicionar uma camada guiada (wizard de 8 etapas) ao cadastro de Passagem Aérea no Orçamento, reaproveitando 100% dos campos, validações e fluxo de salvamento existentes. **Nada do formulário manual atual é alterado, removido ou recriado**.

## Visão geral

Quando o usuário clica para adicionar um serviço do tipo Passagem Aérea, em vez de abrir direto o `FlightForm` atual, exibimos primeiro uma tela de **escolha de modo**:

- **Preencher com ajuda** (passo a passo)
- **Preencher manualmente** (formulário completo atual — comportamento idêntico ao de hoje)

Se escolher manual → renderiza o `FlightForm` como já é hoje (zero mudança de comportamento).
Se escolher assistido → renderiza um novo componente `FlightWizard` que produz **exatamente o mesmo payload** que o `FlightForm` ao salvar.

## Arquivos a criar

- `src/components/quote/flight-wizard/FlightWizard.tsx` — orquestra etapas, estado central, persistência de rascunho.
- `src/components/quote/flight-wizard/types.ts` — tipo `WizardFlightDraft` (espelha `FlightData` + `option_label`, `description`, `notes`, `image_urls`, `payment_config`).
- `src/components/quote/flight-wizard/steps/Step1Main.tsx` — companhia, origem, destino, tipo (ida e volta / só ida), datas, bagagem, taxa.
- `src/components/quote/flight-wizard/steps/Step2Outbound.tsx` — trechos da ida (reutiliza `FlightLegFields` já existente).
- `src/components/quote/flight-wizard/steps/Step3Return.tsx` — trechos da volta (oculto se "somente ida").
- `src/components/quote/flight-wizard/steps/Step4Baggage.tsx` — reforço de bagagem/taxa (mesmos checkboxes).
- `src/components/quote/flight-wizard/steps/Step5Prices.tsx` — valor adulto / valor criança.
- `src/components/quote/flight-wizard/steps/Step6Payment.tsx` — primeiro pergunta "padrão vs personalizado"; se personalizado, reutiliza `ServicePaymentForm`.
- `src/components/quote/flight-wizard/steps/Step7Presentation.tsx` — etiqueta (com sugestões clicáveis), fotos (reutiliza o mesmo `photoSlot` que o form manual recebe), descrição, observações.
- `src/components/quote/flight-wizard/steps/Step8Review.tsx` — resumo + alertas amigáveis + ações.
- `src/components/quote/flight-wizard/ModeChooser.tsx` — tela inicial com os 2 cards de escolha.
- `src/components/quote/flight-wizard/useFlightDraft.ts` — wrapper de `useFormDraft` (chave `flight-wizard:{quoteId}:{serviceId|new}`).
- `src/components/quote/flight-wizard/flightStatus.ts` — função pura `computeFlightStatus(data)` → `'draft' | 'incomplete' | 'ready'`.

## Arquivos a alterar (mínimo possível)

- `src/components/quote/ServiceForms.tsx` — no switch do `case "flight"` (linha ~1842), encapsular num componente `FlightFormOrWizard` que, **só para flight**, decide entre `ModeChooser → FlightWizard` ou `FlightForm`. O componente `FlightForm` em si **não é modificado**. Quando vier `initialData` (edição), pular o ModeChooser e abrir o `FlightForm` clássico — preserva o comportamento "depois de salvo, edição continua igual".
- `src/types/quote.ts` — adicionar campo opcional `flight_status?: 'draft' | 'incomplete' | 'ready'` dentro de `FlightData` (campo opcional, não quebra dados existentes; salvo dentro de `service_data`).

Nenhuma migration de banco. Nenhuma mudança em RLS, edge functions, OG, público.

## Comportamento do wizard

- Indicador de progresso "Etapa X de N" (N = 7 se "somente ida", 8 se ida e volta).
- Botões: **Voltar**, **Pular por enquanto**, **Continuar**, **Salvar rascunho**, **Abrir edição completa** (em qualquer etapa, transfere o estado atual para o `FlightForm` manual já preenchido).
- Toda etapa é opcional (nada bloqueia avançar).
- Rascunho persistido em `localStorage` via `useFormDraft` (já existe em `usePersistedState.ts`).
- Ao salvar: monta o mesmo objeto `FlightData` que o `FlightForm.handleSubmit` monta e chama o mesmo `onSubmit(data, amount, optionLabel, description, undefined, imageUrls)` — garante paridade absoluta com o fluxo manual.

## Status visual

`computeFlightStatus` (puro, sem efeitos):
- `ready` se: companhia + origem + destino + data ida + (data volta OU somente ida) + adult_price > 0.
- `draft` se: salvo via "Salvar rascunho" (flag explícita).
- `incomplete` caso contrário.

Exibido como Badge no `ServiceCard` para serviços `flight`. Adicionar leitura de `service_data.flight_status` em `ServiceCard.tsx` apenas para flight (mudança visual mínima, 1 badge).

## Preparação futura para IA/upload

`FlightWizard` aceita prop opcional `prefill?: Partial<WizardFlightDraft>` que pré-popula o draft inicial. É só isso — nenhuma UI, OCR, upload ou IA agora. Quando vier a fase futura, o consumidor passa `prefill` e o wizard já valida etapa por etapa.

## Detalhes técnicos

- Reuso direto: `FlightLegFields`, `ServicePaymentForm`, `PlacesAutocomplete` (origem/destino), componente de upload de fotos (mesma prop `photoSlot` passada de fora).
- O wizard mantém estado próprio em `useState` + sincroniza com `useFormDraft` (debounced). Não usa `react-hook-form` para simplicidade — toda validação é apenas visual ("alertas amigáveis"), nunca bloqueante.
- Tela final faz o mesmo mapeamento de `outbound_legs`/`return_legs` (+ `outbound_detail`/`return_detail` para backward compat) que o `FlightForm` faz hoje.
- Sugestões de etiqueta como chips clicáveis que apenas preenchem o input (usuário pode editar/limpar).
- Edição de um serviço já salvo abre o `FlightForm` clássico (não o wizard), evitando qualquer regressão na edição.

## Fora de escopo (não fazer)

- Não criar OCR, parser de PDF, integração IA, upload de e-mail.
- Não alterar a página pública do orçamento.
- Não alterar `QuoteService`/colunas do banco.
- Não tocar nos demais tipos de serviço (hotel, transfer, etc.).
- Não mudar fluxo de edição de serviço existente.

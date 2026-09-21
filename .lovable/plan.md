# Relatório de investigação — calendários de intervalo no mobile

Objetivo: mostrar **um mês por vez no celular**, com setas de navegação e swipe, preservando dois meses no desktop. Nada foi alterado; este é um relatório para aprovação.

## Situação atual (verificada no código)

Existe um único componente base de calendário: `src/components/ui/calendar.tsx` (react-day-picker v8, dentro de `Popover`). Nele, `classNames.months` é `flex flex-col sm:flex-row`, ou seja: quando um formulário pede dois meses, **no celular os dois meses ficam empilhados verticalmente**, alongando o popover. Não existe swipe em nenhum calendário do projeto.

Acima dele há um componente compartilhado de período: `src/components/whitelabel/TripDatePicker.tsx`, reexportado como `src/components/shared/TripPeriodField.tsx`. Ele já calcula `months = matchMedia("(min-width: 768px)") ? 2 : 1` — porém apenas **uma vez, na renderização**, sem reagir a rotação/redimensionamento, e sem swipe.

Vários formulários **não usam** o componente compartilhado e passam `numberOfMonths={2}` fixo — esses são os casos piores no celular.

## Grupo A — intervalos obrigatoriamente abrangidos

### A1. Herança direta pelo componente compartilhado (`TripDatePicker`/`TripPeriodField`)
Seleção de intervalo, base react-day-picker `mode="range"` em Popover, hoje 1 mês no mobile (sem swipe, sem reação a resize). Correção herdada, sem ajuste local:

| Tela/fluxo | Arquivo |
|---|---|
| CRM — Oportunidade (período da viagem) | `src/components/crm/OpportunityForm.tsx` |
| CRM — Nova viagem do cliente | `src/components/crm/AddTripDialog.tsx` |
| CRM — Importar orçamento como oportunidade | `src/components/crm/ImportQuoteAsOpportunityDialog.tsx` |
| CRM — Operações: criar, detalhe e serviços | `src/components/crm/operations/CreateOperationDialog.tsx`, `OperationDetailDialog.tsx`, `OperationServicesTab.tsx` |
| Orçamento — editar datas da proposta | `src/components/quote/QuoteDateEditor.tsx` |
| Orçamento — período do bloco de serviços | `src/components/quote/QuoteServicesOrganizer.tsx` |
| Orçamento — serviços: hospedagem, locação de carro, seguro, cruzeiro | `src/components/quote/ServiceForms.tsx` (linhas ~1088, ~1360, ~1879, ~2098) |
| Carteira digital — serviços: hospedagem, seguro, cruzeiro | `src/components/trip/TripServiceForms.tsx` (~1324, ~4226, ~4881) |
| Carteira digital — configurações iniciais e página da viagem | `src/components/wallet/WalletInitialSettings.tsx`, `src/pages/TripWallet.tsx` |
| Roteiro — criar/editar, importar, instanciar modelo | `src/pages/CriarRoteiro.tsx`, `src/components/itinerary/ImportItineraryWizard.tsx`, `InstantiateTemplateDialog.tsx` |
| Reservas — nova reserva, rascunho, serviço manual | `src/components/reservas/NovaReservaDialog.tsx`, `EditarRascunhoDialog.tsx`, `ManualServiceDialog.tsx` |
| Vendas — nova venda e cabeçalho da venda | `src/components/vendas/BookingFormDialog.tsx`, `BookingHeader.tsx` |
| Requisitos de viagem — etapa da viagem | `src/components/travel-requirements/TripStep.tsx` |
| Sites white-label/SiteLab — solicitação de serviço e assistente de orçamento | `src/components/whitelabel/ServiceInitialFields.tsx`, `AgencyQuoteJourney.tsx` |

Riscos: popover renderizado em portal com tema da agência (`portalThemeClass`) e `ScopedPopoverPortal`; dentro dos modais fullscreen mobile recém-criados o portal precisa continuar acima do teclado; o estado de intervalo entre meses (ida em um mês, volta em outro) deve sobreviver à troca de mês por seta/swipe; regressão de dois meses no desktop.

### A2. Calendários de intervalo locais com `numberOfMonths={2}` fixo (exigem ajuste local ou migração)
Hoje no celular empilham **dois meses verticalmente**:

| Tela/fluxo | Arquivo / componente |
|---|---|
| Criação rápida no dashboard e criação completa de orçamento (datas da viagem) | `src/components/quote/QuoteClientForm.tsx` (~396) |
| Criação rápida e completa de roteiro (período) | `src/components/itinerary/ItineraryForm.tsx` (~284) |
| Criação rápida e edição da carteira digital (período) | `src/components/trip/TripForm.tsx` (~188), `src/components/trip/TripEditForm.tsx` (~159) |
| Dashboard Start — busca de bloqueios aéreos (ida/volta) | `src/components/dashboard/start/BloqueiosAereosStartCard.tsx` (~169) |

Observação: a criação rápida de **cliente** (`QuickAddClientDialog`) não possui intervalo — fora do escopo.

## Grupo B — datas únicas que permanecem fora desta mudança
`mode="single"` em Popover, 1 mês, sem alteração: validade do orçamento (`src/pages/GerarOrcamento.tsx`), datas de voo/transfer/ingresso em `ServiceForms.tsx` e `TripServiceForms.tsx`, `src/components/quote/flight-wizard/FlightWizard.tsx`, `src/components/bloqueios/BlockSearchForm.tsx`, `src/components/admin/AdminUserAnalytics.tsx`, `src/components/financial/NewSaleWizard.tsx`, data única em `AddTripDialog`, `src/components/whitelabel/RouteLegsEditor.tsx`, campos "single" do `ServiceInitialFields`/`AgencyQuoteJourney`.

## Grupo C — incertos/legados, precisam de validação manual
1. **Pares de datas em campos nativos `type="date"`** (abrem o calendário do sistema operacional, já mostram um mês): Financeiro (`ExportModal`, `CashFlowManager`, `SalesManager`, `ExpenseManager`, `SmartExpenseManager`, `IncomeManager`, `EntradasManager`, `CommissionsReceivable`, `SellersCommissionReport`, `invoices/*`, `contracts/*`), Admin (`AdminFlightBlocksManager`, `AdminAgendaEventsManager`, `AdminPopupsManager`, `AdminUserUsageReport`, `WhiteLabelAdminDialog`, curadoria/comunidade), `src/components/reservas/ReservasTab.tsx`, `src/pages/MinhaVitrine.tsx`, `src/components/quote/QuoteBookingRequestSettings.tsx`, `ImportItineraryWizard` (campos auxiliares), `TravelersSection`/`PassengerStep` (validade de passaporte — data única).
2. **`FlightWizard`**: ida e volta são dois calendários single independentes; conceitualmente é um intervalo. Decidir se entra como intervalo real em fase posterior.
3. **Landing Orlando Magic** (`TripDatesForm.tsx`): chegada/partida em campos nativos, formulário demonstrativo.
4. **Agenda, TravelMeet e Educa Travel Academy**: não foram encontrados calendários de intervalo próprios; a Agenda usa grades de mês/semana/dia e campos nativos no admin. Vale conferência visual.

## Estratégia de implementação em fases

**Fase 1 — base compartilhada, menor risco**
- `src/components/ui/calendar.tsx`: garantir explicitamente um mês por vez no mobile e dois no desktop; manter setas visíveis e acessíveis (rótulos "Mês anterior/próximo"); adicionar gesto de swipe horizontal opcional (via prop) que apenas dispara a navegação de mês do react-day-picker, sem interferir na seleção de dias nem na rolagem vertical.
- `src/components/whitelabel/TripDatePicker.tsx`: trocar o cálculo único de `matchMedia` por um hook reativo (reutilizar `use-mobile`), ativar o swipe e manter largura/`max-w` do popover.
- Resultado: todo o Grupo A1 corrigido por herança.

**Fase 2 — calendários locais de intervalo**
Migrar os cinco casos do Grupo A2 para o componente compartilhado quando o formulário permitir (preferido), ou, onde a migração alterar layout/validação, apenas trocar `numberOfMonths={2}` pela contagem responsiva e ativar swipe.

**Fase 3 — validação e decisões do Grupo C**
Conferência visual em 360/390/768/1280 px; decidir com você sobre `FlightWizard` e sobre padronizar (ou não) os pares nativos do Financeiro/Admin.

## Testes previstos
- Atualizar `src/test/trip-period-field.test.tsx` e `crm-opportunity-trip-period.test.tsx`.
- Novo teste de calendário responsivo: um mês no mobile, dois no desktop, setas presentes, swipe não quebra a seleção de intervalo entre meses.
- Novo teste estático garantindo que nenhum formulário de intervalo volte a usar `numberOfMonths={2}` fixo.
- Suíte completa, typecheck e build.

## Arquivos previstos para alteração
`src/components/ui/calendar.tsx`, `src/components/whitelabel/TripDatePicker.tsx`, `src/components/shared/TripPeriodField.tsx` (se precisar repassar props), `src/components/quote/QuoteClientForm.tsx`, `src/components/itinerary/ItineraryForm.tsx`, `src/components/trip/TripForm.tsx`, `src/components/trip/TripEditForm.tsx`, `src/components/dashboard/start/BloqueiosAereosStartCard.tsx`, testes citados, `roadmap.md`.

Sem alterações de banco, migrations, RLS ou regras de negócio. Sem publicação.

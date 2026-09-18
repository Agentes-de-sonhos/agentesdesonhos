# Auditoria de períodos de datas — plataforma Agentes de Sonhos

Auditoria de leitura apenas. Nenhum arquivo do sistema foi alterado.

## Resumo executivo

Foram inspecionadas 40 telas/formulários reais com datas relacionadas.

| Categoria | Qtde | Leitura |
|---|---|---|
| A — já usa seletor único de intervalo | 6 | período geral da viagem em orçamento, carteira (criar e editar), roteiro, oportunidade do CRM e cotação dos sites públicos |
| B — campos separados e bom candidato à unificação | 17 | serviços com período contínuo e vários formulários de viagem/operação |
| C — deve continuar separado | 9 | trechos aéreos, paradas de cruzeiro, datas com horário próprio, eventos independentes |
| D — só exibição / filtro, sem entrada de período | 8 | Área do Cliente, drawer da oportunidade, filtros de relatório e da Central de Reservas |

Padrão encontrado: o seletor único só existe hoje no **período total** da viagem. Todo **serviço individual** (hospedagem, locação, seguro, cruzeiro, transfer) ainda usa dois calendários ou dois campos de data, tanto em Orçamentos quanto na Carteira Digital. O seletor de intervalo é um componente único, compartilhado entre plataforma principal, SiteLab Base e white-labels (nenhuma cópia por agência).

## Tabela completa

| Módulo / recurso | Situação atual | Campos | Arquivo | Classe | Recomendação |
|---|---|---|---|---|---|
| Orçamento — dados gerais da viagem | 1 seletor de intervalo | start_date/end_date | quote/QuoteClientForm.tsx:330 | A | manter |
| Orçamento — edição rápida de datas | 2 calendários | start_date/end_date | quote/QuoteDateEditor.tsx:76 | B | unificar (mesma viagem) |
| Orçamento — hospedagem | 2 calendários | check_in/check_out | quote/ServiceForms.tsx:1077 | B | unificar |
| Orçamento — seguro | 2 calendários | start_date/end_date | quote/ServiceForms.tsx:1913 | B | unificar |
| Orçamento — cruzeiro (vigência) | 2 calendários | start_date/end_date | quote/ServiceForms.tsx:2139 | B | unificar |
| Orçamento — locação de carro | 2 calendários + 2 horas | pickup_date/time, dropoff_date/time | quote/ServiceForms.tsx:1355 | B | unificar datas, manter horas |
| Orçamento — transfer ida e volta | 2 calendários | arrival_date/departure_date | quote/ServiceForms.tsx:1600 | C | manter (eventos distintos) |
| Orçamento — aéreo (ida/volta) | 2 calendários | departure_date/return_date | quote/ServiceForms.tsx:567 | C/B | avaliar (ver dúvidas) |
| Orçamento — assistente de voo | 2 calendários + data por trecho | departure_date/return_date, leg_date | quote/flight-wizard/FlightWizard.tsx:489 | C/B | avaliar junto do aéreo |
| Orçamento — cruzeiro (paradas) | 1 data por porto + horas | itinerary[].date | quote/ServiceForms.tsx:2036 | C | manter |
| Orçamento — trem | 1 data + 2 horas | travel_date | quote/ServiceForms.tsx:2515 | C | manter |
| Orçamento — blocos/seções de serviços | 2 campos de data | start_date/end_date | quote/QuoteServicesOrganizer.tsx:103 | B | unificar |
| Orçamento — validade/prazo de solicitação | 1 data | valid_until, booking_deadline | GerarOrcamento.tsx:1890; QuoteBookingRequestSettings.tsx:169 | C | manter |
| Orçamento — ingresso/atração, outros, circuito, pacote | sem par de datas | — | quote/ServiceForms.tsx | D | nada a fazer |
| Carteira — criar viagem | 1 seletor de intervalo | start_date/end_date | trip/TripForm.tsx:187 | A | manter |
| Carteira — editar viagem | 1 seletor de intervalo (componente separado) | start_date/end_date | trip/TripEditForm.tsx:158 | A | manter; avaliar unificar componentes |
| Carteira — edição direta na página | 2 campos independentes | start_date/end_date | pages/TripWallet.tsx:1633 | B | unificar |
| Carteira — hospedagem | 2 calendários + horas | check_in/check_out | trip/TripServiceForms.tsx:1322 | B | unificar datas |
| Carteira — locação de carro | 2 campos + horas | pickup_date/dropoff_date | trip/TripServiceForms.tsx:2222 | B | unificar datas |
| Carteira — seguro | 2 calendários | start_date/end_date | trip/TripServiceForms.tsx:4248 | B | unificar |
| Carteira — cruzeiro (vigência) | 2 calendários | start_date/end_date | trip/TripServiceForms.tsx:4927 | B | unificar |
| Carteira — voo por segmento, cruzeiro paradas, trem, transfer | data por evento + horas | flight_date, date, travel_date | trip/TripServiceForms.tsx:640, 5089, 6350, 2866 | C | manter |
| Roteiro — dados gerais | 1 seletor de intervalo | start_date/end_date | itinerary/ItineraryForm.tsx:249 | A | manter |
| Roteiro — importar com IA | 2 campos de data | start_date/end_date | itinerary/ImportItineraryWizard.tsx:465 | B | unificar |
| Roteiro — usar modelo/template | 2 campos de data | start/end | itinerary/InstantiateTemplateDialog.tsx:104 | B | unificar |
| Roteiro — dias e atividades | dia derivado do início | day_number | itinerary/ItineraryEditor.tsx | D | nada a fazer |
| CRM — oportunidade (criar/editar) | 1 seletor de intervalo | start_date/end_date | crm/OpportunityForm.tsx:276 | A | manter |
| CRM — detalhe da oportunidade | só exibição | start_date/end_date | crm/OpportunityDetailsDrawer.tsx:127 | D | nada a fazer |
| CRM — viagem do cliente (criar/editar) | 2 calendários | start_date/end_date | crm/AddTripDialog.tsx:213 | B | unificar |
| CRM — importar orçamento como oportunidade | 2 campos de data | start_date/end_date | crm/ImportQuoteAsOpportunityDialog.tsx:253 | B | unificar |
| CRM — criar operação | 2 campos de data | travel_start_date/travel_end_date | crm/operations/CreateOperationDialog.tsx:81 | B | unificar |
| CRM — editar operação | 2 campos de data (outro componente) | travel_start_date/travel_end_date | crm/operations/OperationDetailDialog.tsx:202 | B | unificar |
| CRM — serviço da operação | 2 campos de data | start_date/end_date | crm/operations/OperationServicesTab.tsx:263 | B | unificar |
| CRM — viajantes | validade de passaporte | validade_passaporte | crm/TravelersSection.tsx:291 | C | manter |
| Reservas — nova reserva | 2 campos "Ida"/"Volta" | start_date/end_date | reservas/NovaReservaDialog.tsx:202 | B | unificar |
| Reservas — editar processo | 2 campos de data | start_date/end_date | reservas/EditarRascunhoDialog.tsx:218 | B | unificar |
| Reservas — serviço manual | 2 campos de data | start_date/end_date | reservas/ManualServiceDialog.tsx:206 | B | unificar |
| Reservas — filtros da listagem | 2 campos (filtro) | from/to | reservas/ReservasTab.tsx:371 | D | opcional |
| Vendas — cabeçalho e criação de venda/viagem | 2 campos de data | start_date/end_date | vendas/BookingHeader.tsx:73; vendas/BookingFormDialog.tsx:78 | B | unificar |
| Financeiro — venda, produtos, recebimentos, notas | datas contábeis isoladas | sale_date, expected_date, invoice_* | financial/* | C | manter (fora do escopo) |
| Requisitos de viagem — etapa da viagem | 2 campos de data | departure_date/return_date | travel-requirements/TripStep.tsx:46 | B | unificar |
| Sites ADS / SiteLab / white-labels — cotação | 1 seletor de intervalo compartilhado | data_ida/data_volta, check_in/check_out, retirada/devolução | whitelabel/ServiceInitialFields.tsx:65 | A | manter |
| Sites — multitrechos aéreos | 1 data por trecho | leg.data | whitelabel/RouteLegsEditor.tsx:70 | C | manter |
| Landing Orlando Magic | 2 campos de data, sem o componente compartilhado | arrival/departure (demo) | landing/orlando-magic/TripDatesForm.tsx:66 | B | unificar (baixa prioridade) |
| Área do Cliente | só exibição | — | clientarea/ClientAreaTripDetail.tsx:176 | D | nada a fazer |
| Admin — bloqueios aéreos, popups, relatórios | 2 campos de data | start_date/end_date, filtros | admin/* | B/D | opcional, baixa prioridade |

## Ordem de implementação sugerida

1. **CRM completo** (viagem do cliente, criar e editar operação, serviço da operação, importar orçamento): mesmo módulo, já com o padrão novo na oportunidade.
2. **Central de Reservas** (nova reserva, editar processo, serviço manual) + cabeçalho/criação de venda: mesmo fluxo operacional.
3. **Serviços com período contínuo em Orçamentos** (hospedagem, seguro, cruzeiro, locação) e a edição rápida de datas do orçamento.
4. **Os mesmos serviços na Carteira Digital** e a edição direta de datas na página da viagem.
5. **Roteiros** (importar com IA, usar modelo) e requisitos de viagem.
6. **Itens opcionais**: landing Orlando Magic, telas de administração e filtros por período.

## Impacto, risco e dependências

- Baixo risco: CRM, reservas, roteiros e requisitos de viagem gravam apenas duas datas simples; a troca é de interface.
- Risco médio: hospedagem e locação, porque a data vem acompanhada de horário e a locação já sincroniza retirada/devolução; é preciso preservar as horas e o cálculo de diárias, além do orçamento web, PDF, duplicação e importação.
- Dependência comum: todos passariam a usar o mesmo seletor de intervalo já existente, sem migração de banco — os campos continuam gravados separadamente.
- Criação e edição compartilham o formulário na maioria dos casos; exceções que exigem dois ajustes: viagem da carteira (criar/editar), operação do CRM (criar/editar) e a edição direta de datas na página da viagem.

## Dúvidas que precisam da sua decisão

1. **Aéreo**: ida e volta devem virar um período único, ou continuam separados por causa de trechos, escalas e horários?
2. **Transfer in/out**: unificar como período ou manter como dois eventos independentes?
3. **Hospedagem e locação**: manter os horários visíveis ao lado do período unificado, como hoje?
4. **Telas de administração e filtros de relatório** entram nesta padronização ou ficam de fora?
5. Quer que a edição rápida de datas do orçamento e a edição direta na página da viagem passem a usar exatamente o mesmo campo dos formulários?

## Custo

Não tenho acesso à contagem de créditos neste ambiente; esta rodada consistiu apenas em leitura de código (três varreduras paralelas), sem alterações, commit ou publicação.

---
name: Roteiros — edição pós-criação
description: Regras de remarcação de datas, nomes dos viajantes e importação unificada (arquivo ou orçamento) no módulo de roteiros
type: feature
---

## Datas do roteiro
- O campo de período usa rascunho local (`ItineraryDatesEditor`) e só grava ao clicar em "Aplicar novas datas"; sem rascunho o primeiro clique era descartado e a data inicial ficava impossível de alterar.
- Mudar a data inicial desloca todos os dias em cascata preservando atividades (`adjustItineraryDates`).
- Encurtar o período nunca apaga atividades silenciosamente: confirmação com duas opções — `extraDaysStrategy: "merge"` (move atividades para o último dia mantido) ou `"delete"` (remove os dias extras).

## Nomes dos viajantes
- Gerenciados após a criação em Configurações do Roteiro (`ItineraryPassengersCard`), gravados na coluna `passengers` do roteiro, que já alimenta capa, link público e PDF.

## Importação
- Botão único "Importar" abre `ImportSourceDialog` com duas origens: arquivo/texto (`ImportItineraryWizard`, com IA) ou orçamento (`ImportQuoteItineraryDialog`).
- A importação de orçamento reaproveita `mapQuoteServiceToTripService` + `servicesToActivities`, cria todos os dias do período e converte serviços em atividades por data/período.

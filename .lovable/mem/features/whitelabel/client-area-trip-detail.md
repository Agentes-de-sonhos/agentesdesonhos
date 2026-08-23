---
name: White Label Client Area — detalhe da viagem (Etapa 4)
description: Rota /area-do-cliente/viagens/:id com serviços, programação, viajantes e contato, tudo somente leitura
type: feature
---
- Rota `/area-do-cliente/viagens/:id` renderiza `ClientAreaTripDetail` (`src/components/whitelabel/clientarea/ClientAreaTripDetail.tsx`), com abas: Visão geral, Serviços, Programação, Viajantes + card de atendimento. Somente leitura — nada editável pelo passageiro.
- Toda regra de apresentação vive em `src/lib/clientAreaTripDetail.ts` (rótulos por tipo de serviço, `serviceDetailRows`, `buildTimeline`, ordenação com serviços sem data no fim).
- Dados vêm SOMENTE da ação `trip` da Edge Function `client-area-auth`: escopo duplo no servidor (`operations.user_id = agência do domínio` e `client_id = cliente da sessão`); serviços de `operation_services` e viajantes de `travelers` (nome + responsável).
- Proibido expor ao passageiro: `amount`, `supplier`, `notes`, status de pagamento, CPF/passaporte. `service_data` passa por lista de bloqueio (`BLOCKED_DETAIL_KEY`) e só primitivos curtos; objetos/listas são descartados.
- Status do serviço reflete apenas confirmação/emissão ("Confirmado" / "Em processamento"), nunca pagamento.
- Testes: `src/test/client-area-trip-detail.test.tsx`.

---
name: Atendimento com Horário Programado
description: Botão flutuante do site white label com WhatsApp direto em expediente e recado fora dele; horários da Destinos com a Ju
type: feature
---

# Atendimento com horário programado (site white label)

- Configuração declarativa por hostname em `src/lib/agencySiteAssist.ts` (`ASSIST_BY_HOST`). Hosts sem preset não exibem o botão; os demais tenants seguem intactos.
- Horário SEMPRE avaliado no fuso `America/Sao_Paulo`, independente do relógio do visitante.
- Faixas: janela principal (`days`, `startMinute`, `endMinute`) + `extra[]` para dias com horário diferente.
- Destinos com a Ju (`destinoscomaju.com.br`): segunda a sexta das 9h às 18h e sábados das 9h às 14h. Domingo fechado.
- Em expediente: botão verde WhatsApp com mensagem pré-carregada contextualizada pela página.
- Fora do expediente: cartão com Nome, WhatsApp e mensagem, enviado à Central de Solicitações (`service_key` `inspiracoes`, origem "Site — Recado fora do expediente"), mais escape para WhatsApp.
- Alterações de horário são feitas pelo chat; painel visual ainda não existe.

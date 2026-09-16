# Casa Nova Tur — cenário demonstrativo, datas relativas e URLs amigáveis

O pedido reúne 12 frentes independentes (marcação de cenário, dados de cliente e
acompanhante, viagem com 8 serviços atravessando 6 módulos, CRM, orçamento, roteiro,
carteira, Central de Reservas, financeiro, datas dinâmicas, novo esquema de URLs e uma
bateria de testes). Não cabe com segurança em uma única rodada: envolve migração de
banco, ampliação de uma função de servidor, mudanças no roteador de todas as superfícies
e testes de isolamento entre agências. Entregar tudo de uma vez arriscaria exatamente o
que você pediu para preservar — dados manuais, isolamento por agência e as rotas atuais.

Proposta: quatro etapas, cada uma verificável e sem publicação. Se preferir, aprovo e
começo pela Etapa 1 já nesta sequência.

## Etapa 1 — Fundação segura do cenário

- Nova tabela `demo_scenarios` (tenant, slug do cenário, flag `is_demo`, data da última
  atualização de datas, lock) e `demo_scenario_records` (cenário, tabela, id do registro,
  papel). Grants + RLS restritos: leitura/escrita só pelo dono do tenant e service role.
- Somente tenants presentes em `demo_scenarios` podem receber deslocamento de datas.
- Cleanup/reset passa a percorrer apenas `demo_scenario_records` — nunca `user_id` amplo,
  preservando o cliente “Fernando” e qualquer registro manual.
- `casanova-provision` ganha registro de tudo que cria nesse mapa, mantendo idempotência
  por chave natural (sem duplicar em segunda execução).

## Etapa 2 — Cenário ponta a ponta

- Cliente Ana Martins normalizada (Novo Hamburgo/RS, preferências, notas “Cenário
  demonstrativo — dados fictícios”) e acompanhante Roberto Martins em `travelers`, com
  documento evidentemente fictício e preferências próprias.
- Viagem “Orlando — Disney e Universal”, 2 adultos, 8 dias/7 noites, BRL, ~R$ 41.800, com
  os 8 serviços (aéreo, hotel, 2 traslados, locação, Disney, Universal, seguro).
- Os mesmos 8 serviços replicados com vínculos reais entre orçamento, operação
  (`source_quote_service_id` preservado), `travel_files`, venda e carteira; oportunidade em
  Fechado com histórico das etapas; operação em Emissão/Reservas com pagamento parcial;
  roteiro de 8 dias; grant da viagem para a conta existente da Área do Cliente.
- Auditoria de idempotência do fechamento: reabrir/mover para Fechado não cria segunda
  operação, venda, file ou serviços, e não marca como pago.

## Etapa 3 — Datas relativas restritas a demo

- Função de servidor segura (autorização por tenant marcado como demo + sessão, nunca por
  hostname enviado pelo cliente) que, no primeiro acesso do dia (America/Sao_Paulo),
  desloca por um único delta todas as datas mapeadas do cenário: embarque hoje+3, retorno
  hoje+10.
- Uma execução por dia com lock; tudo em transação única (falha = nenhum deslocamento);
  `created_at`, histórico, tokens, códigos e IDs intocados.

## Etapa 4 — URLs amigáveis por slug + testes

- Resolução genérica por `agency_slug` no host compartilhado
  `sites.agentesdesonhos.com.br/{slug}`, sem hardcode de agência: prefixo aplicado a site,
  `/gestao`, `/area-do-cliente`, `/orcamento/:codigo`, `/roteiro/:codigo`,
  `/carteira/:codigo` e `/fatura/:codigo`.
- Rotas atuais, domínio próprio e `?__agency_host=` continuam funcionando; navegação
  preserva o prefixo; login/callback preservam o caminho de retorno; prévias no host
  compartilhado ficam noindex/nofollow.
- Testes focados: isolamento e cleanup, provisionamento duplo sem duplicação, vínculos
  entre módulos, serviços e IDs de origem, fechamento repetido, financeiro parcial, grant
  da Área do Cliente, datas uma vez por dia com rollback, tenant não-demo intocado, URLs
  com refresh e deep link, ausência de vazamento entre agências e segurança dos documentos
  públicos. Typecheck e build ao fim de cada etapa.

## Pendências externas (fora desta implementação)

- DNS e vinculação de `sites.agentesdesonhos.com.br` e de `casanovatur.com.br` continuam
  pendentes; o código fica pronto, sem publicar nem conectar domínio.

## Observações técnicas

- Migração aditiva apenas (novas tabelas + grants + RLS); nenhuma coluna existente
  alterada ou removida.
- Dados do cenário entram por operações de dados normais, não por migração.
- Nada de e-mails, convites, cobranças, checkout ou notificações externas.

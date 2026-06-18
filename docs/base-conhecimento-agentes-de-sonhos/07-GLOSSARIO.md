# 07 — Glossário

[← Índice](./00-LEIA-ME-E-INDICE.md)

| Termo | Significado na plataforma | Equivalentes / sinônimos | Observação |
|---|---|---|---|
| Agente | Usuário titular da agência ou colaborador autorizado | Consultor, vendedor de viagens | — |
| Agência | Conta/organização do Agentes de Sonhos | — | Cada agência tem `agency_id` próprio |
| Cliente | Pessoa cadastrada no CRM | Contato | Diferente de **passageiro**: cliente é o contratante; passageiro é quem viaja |
| Lead | Interessado captado em formulário/landing | Contato cru, prospect | Vira cliente após qualificação |
| Oportunidade | Negociação no Kanban | Negócio, deal | Tabela `opportunities` |
| Etapa / Estágio | Coluna do funil | Pipeline stage | Configurável em `pipeline_stages` |
| Orçamento | Proposta enviada ao cliente | Cotação, proposta | Tabela `quotes`, link público |
| Roteiro | Programação dia a dia | Itinerário | Tabelas `itineraries`/`trip_itinerary_*` |
| Carteira Digital | App-like com todos os dados da viagem para o viajante | Wallet, hub do viajante | Tabela `trips` + serviços |
| Viagem | Registro operacional da viagem | Trip, reserva | Tabela `trips` |
| Serviço | Item da viagem (aéreo, hospedagem, transfer, ingresso, etc.) | Produto da viagem | `trip_services`/`quote_services` |
| Passageiro | Viajante vinculado à viagem | Traveler | `travelers` |
| Venda | Registro financeiro da operação concretizada | Sale, fechamento | `sales` |
| Entrada | Recebimento de cliente | Recebível, conta a receber | `income_entries`, `customer_payments` |
| Despesa | Pagamento a fornecedor/comissão | Conta a pagar | `expense_entries`, `supplier_payments` |
| Fatura | Documento financeiro para o cliente | Invoice | `invoices` |
| Comissão | Valor pago/recebido pela intermediação | — | Agência recebe, vendedor recebe; ambos registrados |
| Operação | Acompanhamento pós-venda | Pós-venda, gestão de viagem | `operations` |
| Vitrine | Página pública de ofertas da agência | Showcase, vitrine de ofertas | `agency_showcases` + `showcase_items` |
| Cartão de Visitas | Cartão digital com QR e link | Cartão digital, business card | `business_cards` |
| Lâmina | Imagem promocional gerada pelo Personalizador | Flyer, peça | — |
| EducaTravel Academy | Plataforma de trilhas internas | Academy | `learning_trails`, `trail_*` |
| Cursos | Marketplace de cursos pagos | Marketplace | `marketplace_courses` |
| Mentorias | Mentorias agendáveis | — | `mentorships` |
| Trade Connect | Marca anterior da Comunidade | Comunidade | Rotas `/comunidade/*` redirecionam |
| Radar do Turismo | Curadoria de notícias | Notícias do Trade | `news`, `noticias_*` |
| Bloqueio Aéreo | Lote de assentos para venda | Block aéreo | `air_blocks`, `flight_blocks` |
| Raio-X do Hotel | Análise estratégica via Google Places + IA | Hotel X-Ray | `hotel_rx_cache` |
| Travel Advisor | Recomendações curadas por categoria | Dream Advisor | `advisor_*` |
| Captura de Cartão | OCR de cartão de visitas com IA | Card capture | `crm_card_captures` |
| Sales Landing | Página de vendas com captura de leads | Landing | `sales_landings` |
| Pesquisa | Formulário de satisfação | Survey | `surveys`, `survey_questions`, `survey_responses` |
| Voucher | Documento operacional da viagem | — | Servido via Edge Function privada |
| Token de acesso público | String em URL que libera leitura pública | Slug + token | Usado em links `*.tur.br` |
| Impersonar | Acessar como outro usuário (admin) | Login as | `impersonate-user` |
| Plano Start / Profissional / Premium | Faixas de assinatura | — | `subscriptions` + `useSubscription` |
| Feature gate | Bloqueio de funcionalidade por plano/permissão | — | Componente `FeatureGate` |
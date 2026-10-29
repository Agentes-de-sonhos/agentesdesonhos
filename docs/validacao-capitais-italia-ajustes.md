# Capitais da Itália — validação de 29/10/2026

- Alterações opt-in para Capitais da Itália; demais circuitos mantêm apresentação e ações anteriores.
- Noites derivadas do itinerário: Roma 4 (dias 1, 2, 3 e 6), Florença 1 (dia 4), Veneza 1 (dia 5). Rávena e Assis sem hospedagem. Preço original EUR 906 preservado.
- Cotação real recebida de `fx-rate`: EUR/BRL 5,956273, data 29/10/2026; preço exibido R$ 5.396,38. Conversão inválida/indisponível coberta por teste.
- 31 testes aprovados: circuitos, cálculo, contato/consentimento, hook de solicitações e integração de câmbio. Build automático OK.
- Navegador: 1280, 768, 390 e 360 pixels sem overflow horizontal; sete dias visíveis, modal com saída escolhida, consentimento obrigatório, efeitos em dispositivos com mouse. Evidências em `/tmp/browser/circuit/`.
- Envio real identificado como teste: solicitação `6019c6f0-1b4b-40e5-bd46-e90f474473f3`, saída 01/11/2026. Registro e vínculos a cliente/oportunidade lidos no banco; proprietário da oportunidade igual ao da agência Drica.
- Fila existente confirmou `email_agency=sent` e `whatsapp_agency=sent`. Isso confirma aceite dos serviços, não leitura humana ou entrega à caixa de entrada/dispositivo.
- E-mail adicional de confirmação do passageiro permaneceu pending (422), pois o teste usou endereço `example.com`. Não é evidência de entrega para passageiros reais.
- CRM foi conferido por leitura dos registros; tela autenticada do CRM da Drica não foi aberta. Nenhuma nova migration, permissão, credencial ou função implantada. Nada publicado.
- Solicitações reaproveitam sanitização, origem, consentimento, rate limit, honeypot e deduplicação existentes. Datas e passageiros são detalhes da solicitação, não inventário/reserva confirmado pelo servidor; não foi criado um sistema de reserva paralelo.
- O logo do cabeçalho já não carregava no contexto testado; não foi alterado neste escopo.
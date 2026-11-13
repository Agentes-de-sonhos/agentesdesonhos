# Arena — preparação sem publicação

## Implementado
- Perfil oficial `arenaOfficial` reaproveita a apresentação aprovada e suas mídias, sem `demo` ou `presentation`; a identidade nunca vem da fixture.
- Hosts root/www recebem o mesmo tema, contatos, certificado e galeria de Orlando; somente Arena saiu de `homeBrands`.
- CSS aprovado foi movido do renderer técnico para `.wl-arena`; bloqueios de rede, envio e noindex da fixture continuam exclusivamente no renderer técnico.
- Atendimento usa o preset compartilhado: segunda a sexta, 09:00 inclusive até 18:00 exclusive, America/Sao_Paulo; WhatsApp 5547992690807. Fora do horário abre o recado padrão.
- Disney/Universal no perfil oficial usam o shell compartilhado e conteúdo embedded, sem duplicar cabeçalhos; links de especialidades mantêm `/#autoridade`, catálogo mantém menu de cruzeiros nacionais.

## Bloqueio real
A API existente `admin-create-user` negou a criação (403: Apenas administradores). A sessão do solicitante tem papel `agente`. Não foi elevada, não foi utilizada a sessão de outro administrador, não houve INSERT em Auth nem alteração de funções.

Consulta somente leitura confirmou ausência do e-mail arenatravel@arenatravelgroup.com.br em Auth, de perfil Arena/CNPJ 57332735000130 e de linhas root/www em agency_public_domains. Portanto não existe tenant id real para informar. Domínios conectados ao projeto não equivalem a vínculo da agência no banco.

Próxima ação: um administrador autorizado deve criar Rafael pela API existente/gestão administrativa, sem envio de testes, e então vincular os hosts e habilitar o portal. O produto vigente deve ser confirmado: `agency_has_client_area` depende da elegibilidade compartilhada (premium/fundador vigente + domínio ativo). Nenhuma assinatura foi alterada.

## Formulários e notificações
Pipeline existente: submit-agency-site-request → resolução server-side do host ativo → pedido/lead → ensure_client_and_opportunity_for_lead → oportunidade → fila de notificações. O destinatário de e-mail da agência deriva do e-mail Auth; WhatsApp deriva de profiles.phone. Sem Rafael/tenant real, destinatários não foram persistidos e recebimento não foi testado. Não enviar testes para Rafael. Entrega depende também da configuração vigente dos provedores; aceitação/entrega não foi comprovada.

## Validação
- 47 testes / 8 arquivos passaram (Arena oficial/finalização/hero/destinos, atendimento, Cadastur, Club Med e navegação de catálogo).
- Build automático da prévia: OK.
- Prévia técnica: seis destinos, wrapper e bloqueios próprios preservados.
- Desktop 1280×1800 e mobile 390×844: renderer oficial exercitado isoladamente com resposta de domínio simulada apenas no navegador. Seis destinos; nenhum wrapper de AdsBriefingPreview; um cabeçalho institucional em Disney/Universal; botão WhatsApp correto no expediente e recado fora dele.
- Não é validação de tenant real. Sem mock, URL técnica com contexto Arena mostra a página geral, pois a associação não existe.
- Assets permanentes /__l5e não carregaram no localhost (logo/fotos/vídeo/certificado); reprodução e fidelidade visual completa não foram reconfirmadas nesta rodada.
- Sem publicação, alterações de cobrança/Stripe, mudanças de permissões ou envio de mensagens.
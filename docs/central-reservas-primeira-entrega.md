# Central de Reservas — Fase 1 (entrega atual)

Guia curto do que existe hoje. Substitui os apêndices de revisão anteriores.

## 1. Escopo da fase 1

Dentro do escopo:

- Cadastro **manual** de reservas (processos) na Central, além das solicitações que já chegam
  pelo site white label.
- Ficha do processo: dados do contratante, viagem, serviços, responsável, status, notas e
  histórico.
- Contratante **PF ou PJ**, com cadastro de empresas e contato responsável.
- Busca, filtros, contadores e paginação executados no servidor.
- Totais por moeda derivados dos serviços (apresentação).

Fora do escopo, para fases posteriores:

- Vouchers e documentos do processo.
- Integração com a Gestão Financeira (lançamentos, faturamento, comissões efetivas).
- Envio/área do cliente para o processo, conversão de câmbio e regras fiscais.
- Criação automática de CRM, operação, orçamento ou carteira a partir da reserva.

## 2. Navegação

- Menu principal: **Reservas** (`/reservas`, ficha em `/reservas/:id`).
- Área de Gestão: `/gestao/reservas`.
- Ambiente de referência SiteLab: `/sitelab-base/gestao/reservas`.
- O botão "Voltar" da ficha usa a navegação da área ativa, preservando os três caminhos.

## 3. Reserva manual: PF/PJ, edição, serviços e histórico

- **Criação**: começa como **rascunho** (`draft`), sem `root_request_id`, com chave de
  idempotência e numeração sequencial de 7 dígitos por agência. Solicitações do site continuam
  entrando como `request_received`, sem alteração de comportamento.
- **PF/PJ**: `client_id` (pessoa) e `company_id` (empresa) são campos distintos; o contato PJ é
  um cliente vinculado (`contact_client_id`). O seletor de contratante é compartilhado entre
  criação e edição.
- **Edição do rascunho**: permite corrigir contratante e contato depois de salvar. O envio é um
  **patch parcial** — campo não alterado não vai no payload e o servidor preserva o vínculo,
  a moeda e os valores. Limpar um vínculo é sempre explícito.
- **Serviços**: cadastro manual com tipo, produto, fornecedor, datas, quantidade, moeda,
  valores e status. Serviços vindos do site permanecem congelados/imutáveis. Na edição, a
  **moeda do serviço prevalece** sobre a da reserva (tanto no rótulo quanto no envio): editar
  um serviço em USD dentro de uma reserva em BRL nunca reclassifica o valor; a moeda da
  reserva é apenas o fallback para serviço novo ou sem moeda.
- **Histórico**: registra criação, mudanças de status, serviços, responsável, notas e também
  alterações isoladas de moeda, valor solicitado e contato — sem expor valores a quem não tem
  permissão financeira.
- **Permissões**: `reservations.view` / `manage` / `assign` / `financial.manage`, somadas às
  permissões financeiras (`financial.view_revenue`, `financial.view_margin`,
  `financial.commissions.view`). A elegibilidade comercial da Central considera o plano ou a
  concessão da conta principal; colaborador precisa de vínculo ativo. Administradores e
  promotores são exceção.

## 4. Totais por moeda

- Em reservas **manuais**, o valor apresentado vem dos serviços lançados, agrupado por moeda e
  derivado na consulta (`travel_file_detail` e `travel_files_page`). Nada é gravado:
  `travel_files.requested_amount`, snapshots e preços seguem intactos.
- Moedas diferentes **nunca** são somadas nem convertidas: USD 100 + BRL 200 aparecem como dois
  grupos. Serviços cancelados ficam fora. `requested_amount` do serviço já é o total do
  serviço — a quantidade não multiplica de novo.
- Cada bloco financeiro depende da sua permissão; a **margem exige receita e margem**, para não
  ser calculada tratando a receita removida como zero. Sem nenhuma permissão financeira o
  agregado sai vazio.
- Solicitações do site mantêm os valores congelados do processo.

## 5. Cadastro de empresas (PJ) na área de Clientes

- A gravação passa pela RPC `agency_company_save`, que exige: vínculo **ativo**,
  `clients.create` (novo) ou `clients.edit` (alteração) e elegibilidade comercial de
  Clientes/CRM — plano/concessão da conta principal, ou administrador/promotor.
- **Não** exige permissão de Reservas: colaborador de CRM cadastra e edita empresas sem
  `reservations.view`.
- Busca e leitura de cadastros já existentes seguem apenas as permissões, sem gate de plano.
- A ação principal da área de Clientes acompanha a visão selecionada: "Nova pessoa" na visão
  Pessoas, "Nova empresa" na visão Empresas.

## 6. Como testar na prévia (Fernando)

Use **dados fictícios**; não é necessário criar usuários ou senhas.

1. Abra **Reservas** e crie uma reserva manual PF (ex.: "Cliente Teste Alfa", destino
   fictício). Confirme que nasce como rascunho e recebe número.
2. Repita com contratante **PJ**, cadastrando uma empresa fictícia e um contato.
3. Abra o rascunho, altere só o destino e salve: contratante e contato devem permanecer.
4. Lance um serviço de BRL 1.500 e confira o valor na lista e no resumo; edite para 1.600 e
   confira a atualização.
   - O ManualServiceDialog desta fase ainda não oferece seletor de moeda: serviços **novos**
     usam a moeda da reserva, e a edição preserva a moeda já registrada do serviço.
   - Cenários com moedas diferentes na mesma reserva (ex.: reserva em BRL com serviço
     pré-existente em USD) são verificados pelos testes automatizados com fixtures; na prévia
     manual concentre-se no fluxo BRL 1.500 → BRL 1.600.
5. Avance status, adicione nota e confira o histórico.
6. Na área de **Clientes**, alterne entre Pessoas e Empresas e use a ação principal.

## 7. O que foi testado vs. não testado

Testado (automatizado, fixtures sintéticas):

- Rodada da moeda do serviço (mais recente): teste novo atravessa o caminho real
  ProcessoReserva → diálogo → hook/RPC — **2 testes** passando (edição de serviço USD em
  reserva BRL preserva USD no rótulo e no payload; serviço novo usa BRL e refaz as consultas
  de ficha e lista). Regressões relacionadas: **4 arquivos, 61 testes** passando.
  `tsgo --noEmit` e `vite build` sem erros.
- Rodada anterior (CRM/edição): 12 arquivos, 152 testes, todos passando.
- Comportamento de interface: criação PF/PJ, patch parcial da edição, seletor de contratante,
  painel de empresas (abertura única, erro com "Tentar novamente", lista vazia), serviço manual
  (valores pt-BR "1.500,00"/"1500,50", precedência da moeda do serviço), totais por moeda,
  reset ao trocar de identidade.
- Revisão de contrato do SQL efetivamente aplicado: gates, isolamento por agência, projeção
  financeira por permissão, agregado só para origem manual, ausência de gravação nos totais e
  cadastro PJ sem dependência de Reservas.

Não testado:

- Execução autenticada com contas e planos reais, incluindo teste real de acesso **entre
  agências diferentes**.
- Validação visual em navegador autenticado.
- Testes de banco com dados reais de clientes, empresas ou reservas.
- O linter do projeto segue com avisos preexistentes de escopo amplo (execução de funções
  `SECURITY DEFINER`, RLS sem policy, `search_path` mutável, extensão em `public`, proteção de
  senha vazada); esta fase não os revisou um a um.

## 8. Estado de entrega

- **Banco**: migrations aplicadas (funções, gates, agregados por moeda, histórico e políticas
  desta fase).
- **Frontend**: **não publicado** — disponível apenas na prévia.
- Nada foi publicado e nenhum dado real foi criado ou alterado para os testes.

## 9. Limites conhecidos (sem garantia universal)

- **Não há garantia universal de isolamento.** As leituras diretas de reservas de origem
  `web_quote` continuam compatíveis com o legado; o endurecimento completo depende de um
  **deploy coordenado** do frontend e das funções.
- O gate comercial do cadastro PJ vive na RPC `agency_company_save`. Esta rodada **não** blindou
  todos os caminhos legados de escrita direta na tabela de empresas.
- Autenticação real entre agências não foi verificada nesta fase.
- Sem conversão de câmbio: valores em moedas diferentes são sempre exibidos separados.

# Perguntas frequentes — Faturas

Perguntas canônicas validadas com base na implementação atual do módulo Faturas em `/financeiro?tab=invoices`.

## Onde fica o módulo Faturas?

**Pergunta:** Onde fica o módulo Faturas?

**O que o usuário pode perguntar:**
- onde fica faturas
- como acessar faturas
- menu de faturas

**Resposta direta:** No menu **Financeiro**, abra a aba **Faturas** (caminho `/financeiro?tab=invoices`). É lá que você emite, acompanha e cobra as faturas dos seus clientes.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-01`

---

## O que é uma fatura no Agentes de Sonhos?

**Pergunta:** O que é uma fatura no Agentes de Sonhos?

**O que o usuário pode perguntar:**
- o que é fatura
- definição de fatura
- fatura significa o quê

**Resposta direta:** Fatura é o documento de cobrança que a agência emite para o cliente. Ela reúne os serviços vendidos, valores, parcelas e vencimentos, e gera um link público para o cliente acompanhar e pagar. Não é a mesma coisa que **venda**, **entrada** ou **nota fiscal**.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-02`

---

## Qual a diferença entre fatura, venda, entrada e nota fiscal?

**Pergunta:** Qual a diferença entre fatura, venda, entrada e nota fiscal?

**O que o usuário pode perguntar:**
- diferença fatura venda entrada
- fatura é o mesmo que venda
- fatura e nota fiscal

**Resposta direta:** **Venda** é o negócio fechado com o cliente; **fatura** é o documento de cobrança gerado a partir da venda; **entrada** é o valor que entrou (ou vai entrar) no caixa; **nota fiscal** é o documento fiscal emitido fora do Agentes de Sonhos. Cada um vive em uma tela própria do **Financeiro**.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-03`

---

## Como crio uma nova fatura?

**Pergunta:** Como crio uma nova fatura?

**O que o usuário pode perguntar:**
- criar fatura
- nova fatura
- emitir fatura

**Resposta direta:** Em **Financeiro → Faturas**, clique em **Nova fatura**. Preencha os dados do cliente, destino e viagem, adicione os **Serviços**, defina **Parcelas** (se houver) e clique em **Salvar**. A fatura nasce como **Rascunho**.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-04`

---

## Preciso vincular a fatura a um cliente?

**Pergunta:** Preciso vincular a fatura a um cliente?

**O que o usuário pode perguntar:**
- cliente obrigatório fatura
- fatura sem cliente
- preciso de cliente para faturar

**Resposta direta:** Sim, o nome do cliente é obrigatório. Os campos de empresa, documento, e-mail e telefone são opcionais, mas recomendados para o link público e o PDF.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-05`

---

## Posso importar dados de um orçamento ou de uma carteira para a fatura?

**Pergunta:** Posso importar dados de um orçamento ou de uma carteira para a fatura?

**O que o usuário pode perguntar:**
- importar orçamento para fatura
- importar carteira para fatura
- gerar fatura a partir de orçamento

**Resposta direta:** Sim. No topo do formulário de **Nova fatura**, use **Importar do orçamento** ou **Importar da carteira**. Cliente, destino, datas e serviços são preenchidos automaticamente, e você pode ajustar antes de salvar.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-06`

---

## Quais são os status possíveis de uma fatura?

**Pergunta:** Quais são os status possíveis de uma fatura?

**O que o usuário pode perguntar:**
- status da fatura
- fatura aberta paga vencida
- tipos de status

**Resposta direta:** Os status são: **Rascunho**, **Enviada**, **Parcialmente paga**, **Paga**, **Cancelada** e **Vencida**. O status **Vencida** aparece automaticamente quando há saldo em aberto e a data de vencimento já passou.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-07`

---

## Como envio a fatura para o cliente?

**Pergunta:** Como envio a fatura para o cliente?

**O que o usuário pode perguntar:**
- enviar fatura
- publicar fatura
- tornar fatura visível

**Resposta direta:** Na lista, clique no ícone **Enviar** ao lado da fatura em **Rascunho**. O status muda para **Enviada** e o link público fica liberado para compartilhar com o cliente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-08`

---

## Como copio o link público da fatura?

**Pergunta:** Como copio o link público da fatura?

**O que o usuário pode perguntar:**
- link público fatura
- link da cobrança
- compartilhar fatura

**Resposta direta:** Na lista, clique no ícone **Link público** (corrente). O endereço é copiado para a área de transferência no formato `/fatura/{agencia}/{codigo}`. Se a fatura ainda está em rascunho, o sistema pede para publicá-la primeiro.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-09`

---

## Como adiciono parcelas e vencimentos?

**Pergunta:** Como adiciono parcelas e vencimentos?

**O que o usuário pode perguntar:**
- parcelas fatura
- parcelar fatura
- vencimentos da fatura

**Resposta direta:** No formulário da fatura, na seção **Parcelas**, clique em **Adicionar parcela**, informe o rótulo (ex.: Entrada, 2ª parcela), o **valor** e a **data de vencimento**. Você pode criar quantas parcelas precisar.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-10`

---

## Como registro o pagamento de uma fatura?

**Pergunta:** Como registro o pagamento de uma fatura?

**O que o usuário pode perguntar:**
- registrar pagamento
- baixar fatura
- marcar como paga

**Resposta direta:** Na lista, clique no ícone **Registrar pagamento** ($). Informe **valor recebido**, **data**, **forma de pagamento** e, se for o caso, a **parcela** correspondente. O saldo e o status são atualizados automaticamente.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-11`

---

## Existe pagamento parcial?

**Pergunta:** Existe pagamento parcial?

**O que o usuário pode perguntar:**
- pagamento parcial
- fatura paga em partes
- baixa parcial

**Resposta direta:** Sim. Quando o valor recebido é menor que o total, a fatura passa para **Parcialmente paga** e o saldo restante continua aberto. Você pode registrar novos pagamentos até zerar o saldo.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-12`

---

## Como o sistema marca uma fatura como vencida?

**Pergunta:** Como o sistema marca uma fatura como vencida?

**O que o usuário pode perguntar:**
- fatura vencida
- atraso fatura
- fatura em atraso

**Resposta direta:** Faturas com **saldo maior que zero** e **data de vencimento anterior a hoje** recebem o selo **Vencida** automaticamente. Não é necessária ação manual.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-13`

---

## Como baixo o PDF da fatura?

**Pergunta:** Como baixo o PDF da fatura?

**O que o usuário pode perguntar:**
- pdf fatura
- baixar fatura
- exportar fatura

**Resposta direta:** Na lista, clique no ícone **PDF** (download). O arquivo é gerado com os dados da agência, do cliente, serviços, parcelas e o link público (quando já publicado).

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-14`

---

## Como excluo uma fatura?

**Pergunta:** Como excluo uma fatura?

**O que o usuário pode perguntar:**
- excluir fatura
- apagar fatura
- remover fatura

**Resposta direta:** Na lista, clique no ícone da lixeira e confirme. A exclusão é definitiva e remove também os pagamentos e parcelas vinculados. Avalie antes se cancelar não é a melhor opção.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-15`

---

## Posso editar uma fatura depois de criada?

**Pergunta:** Posso editar uma fatura depois de criada?

**O que o usuário pode perguntar:**
- editar fatura
- alterar fatura
- ajustar dados da fatura

**Resposta direta:** Sim. Abra a fatura para alterar os dados do cliente, serviços ou parcelas. Algumas alterações podem afetar o total e o saldo; revise sempre o resumo financeiro antes de salvar.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-16`

---

## A fatura gera uma entrada automaticamente?

**Pergunta:** A fatura gera uma entrada automaticamente?

**O que o usuário pode perguntar:**
- fatura gera entrada
- fatura e entrada
- relação fatura entradas

**Resposta direta:** Não confirmado. **Faturas** e **Entradas** convivem em telas separadas dentro do Financeiro. Para garantir que o recebimento apareça em **Entradas**, registre lá também ou siga o procedimento definido pela sua agência.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-17`

---

## O que o cliente vê pelo link público?

**Pergunta:** O que o cliente vê pelo link público?

**O que o usuário pode perguntar:**
- o que cliente vê fatura pública
- link público cliente
- fatura para cliente

**Resposta direta:** O cliente vê os serviços, valores, parcelas, vencimentos, observações e a chave PIX (se informada). A visualização é apenas para acompanhamento da cobrança — o cliente não edita a fatura.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-18`

---

## Como filtro ou busco minhas faturas?

**Pergunta:** Como filtro ou busco minhas faturas?

**O que o usuário pode perguntar:**
- filtrar faturas
- buscar fatura
- localizar fatura

**Resposta direta:** Use o campo de busca acima da lista para procurar por **número da fatura**, **nome do cliente** ou **destino**. As subabas **Faturas**, **Cobranças** e **Recibos** funcionam como filtros rápidos.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-19`

---

## Onde vejo os recibos dos pagamentos recebidos?

**Pergunta:** Onde vejo os recibos dos pagamentos recebidos?

**O que o usuário pode perguntar:**
- recibos
- recibo pagamento
- comprovante fatura

**Resposta direta:** Na aba **Recibos**, dentro de **Financeiro → Faturas**. Cada pagamento registrado gera um recibo numerado com cliente, fatura, forma de pagamento, data e valor.

**Status da resposta:** pronto.

**Nível de confiança:** confirmado.

**ID:** `ft-faq-20`

---


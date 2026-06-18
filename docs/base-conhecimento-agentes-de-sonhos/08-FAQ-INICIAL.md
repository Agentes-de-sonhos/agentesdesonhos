# 08 — FAQ inicial

[← Índice](./00-LEIA-ME-E-INDICE.md)

> Cada pergunta aqui é canônica e tem variações comuns. Respostas refletem o comportamento observado. Quando algo não pôde ser confirmado, o nível de confiança aparece explicitamente.

---

## CRM e Oportunidades

### Como crio uma nova oportunidade?
**Variações:** Como cadastrar um lead? Onde inicio uma negociação? Como adicionar um deal?

**Resposta:** Vá em **Clientes → Oportunidades** (ou `/crm`) e clique em **Nova oportunidade**. Selecione o cliente (obrigatório) e preencha o formulário. A oportunidade entra na primeira etapa do funil e pode ser arrastada entre colunas.

**Pré-requisitos:** O cliente precisa estar cadastrado. Use o atalho **Adicionar cliente rápido** se necessário.
**Perfil necessário:** titular ou membro de equipe com permissão de CRM.
**Fonte:** `src/components/crm/KanbanBoard.tsx`, `OpportunityForm.tsx`.
**Confiança:** CONFIRMADO.

### Como movo uma oportunidade para outra etapa?
**Resposta:** Arraste o card no Kanban ou abra o detalhe e troque a etapa pelo seletor. O histórico é registrado em `opportunity_history`.
**Confiança:** CONFIRMADO.

### O que acontece quando marco uma oportunidade como ganha?
**Resposta:** A oportunidade muda de estágio e fica disponível no funil filtrado. **PENDENTE DE CONFIRMAÇÃO**: se há criação automática de venda no Financeiro a partir desse status; até onde foi auditado, a venda precisa ser registrada manualmente.

### Onde vejo o histórico de uma negociação?
**Resposta:** Abra o detalhe da oportunidade — abas **Histórico**, **Notas** e **Follow-ups**.
**Confiança:** CONFIRMADO.

### Como cadastro etiquetas para oportunidades?
**Resposta:** No CRM, gerencie etiquetas em **Etiquetas** (`OpportunityLabelsManager`) e aplique pelo seletor rápido no card.
**Confiança:** CONFIRMADO.

---

## Carteira Digital

### Como crio uma carteira digital?
**Resposta:** Vá em **Criar → Carteira Digital** (`/ferramentas-ia/trip-wallet`). Selecione o cliente, preencha dados da viagem e adicione serviços (aéreo, hospedagem, transfer, passeio, ingresso, seguro, locação). Após salvar, o link público (subdomínio `carteiradigital.tur.br`) fica disponível para compartilhar.
**Confiança:** CONFIRMADO.

### Posso proteger a carteira pública com senha?
**Resposta:** Sim. A carteira pública aceita senha; após 3 tentativas inválidas, o acesso é bloqueado temporariamente.
**Confiança:** CONFIRMADO.

### Como o viajante instala a carteira como app?
**Resposta:** Pela própria carteira pública há o botão **Instalar carteira** (PWA), usando o manifesto `wallet-manifest.json`.
**Confiança:** CONFIRMADO.

### Onde vejo o próximo serviço contratado?
**Resposta:** O card **Próximo Serviço Contratado** aparece no topo da carteira pública, com cabeçalho destacado na cor da agência.
**Confiança:** CONFIRMADO.

### Quando há muitos ingressos/hospedagens, como o viajante navega?
**Resposta:** A categoria abre o **CategoryServiceView**, com lista resumo (ícone + nome) e cards detalhados. Tocar no resumo rola até o card correspondente; um único serviço abre o card inteiro sem resumo.
**Confiança:** CONFIRMADO.

---

## Orçamentos

### Como gero um orçamento?
**Resposta:** **Criar → Orçamento** (`/ferramentas-ia/gerar-orcamento`). Selecione cliente, defina moeda (BRL/USD/EUR — não editável depois de criar), adicione serviços com fotos, comentários e termos de pagamento. O link público fica em `seuorcamento.tur.br`.
**Confiança:** CONFIRMADO.

### O orçamento aceita várias moedas?
**Resposta:** Sim. Suporta BRL, USD e EUR, com modos Fixo ou Conversão Automática. A moeda do orçamento não é editável após a criação.
**Confiança:** CONFIRMADO.

### Posso ocultar o investimento total?
**Resposta:** Sim. Há um toggle que esconde os totais globais mantendo os termos de pagamento individuais por serviço.
**Confiança:** CONFIRMADO.

### O orçamento salva sozinho?
**Resposta:** Sim. Existe autosave em `localStorage` com indicador de status; o rascunho é descartado ao salvar/publicar.
**Confiança:** CONFIRMADO.

---

## Roteiros

### Como crio um roteiro?
**Resposta:** **Criar → Roteiros** (`/ferramentas-ia/criar-roteiro`). Defina dias, atividades por período (manhã/tarde/noite) e imagens. Pode usar IA para sugerir atividades.
**Confiança:** CONFIRMADO.

### Posso clonar um modelo de roteiro?
**Resposta:** Sim, em **Modelos de Roteiros** (`/ferramentas-ia/modelos-roteiros`). O modelo é copiado para edição.
**Confiança:** CONFIRMADO.

### O roteiro é editável por dia?
**Resposta:** Sim. O sistema híbrido permite Auto/IA/Manual com coluna de origem por atividade.
**Confiança:** CONFIRMADO.

---

## Financeiro

### Onde registro uma venda?
**Resposta:** **Financeiro → Vendas → Nova venda** (wizard `NewSaleWizard`). Informe cliente, vendedor, produto/serviço, valor, comissões e termos.
**Confiança:** CONFIRMADO.

### Como cadastro um vendedor?
**Resposta:** **Financeiro → Vendedores → Novo** (`SellersManager`). Vendedores podem ou não ser usuários da plataforma.
**Confiança:** CONFIRMADO.

### A comissão do vendedor vira despesa?
**Resposta:** Sim, automaticamente. Atualizar uma venda vinculada a um vendedor cria/atualiza uma despesa do tipo `comissao`.
**Confiança:** CONFIRMADO.

### Como calculo o lucro líquido?
**Resposta:** Lucro líquido = comissões da agência − (despesas + comissões de vendedores). Visível no Smart Dashboard.
**Confiança:** CONFIRMADO.

### Posso exportar relatórios?
**Resposta:** Sim, **Exportar** disponível nas tabelas (XLSX e PDF) respeitando os filtros ativos.
**Confiança:** CONFIRMADO.

---

## Equipe e permissões

### Como adiciono um membro de equipe?
**Resposta:** **Minha Conta → Equipe**. Crie o membro, defina permissões por módulo e (opcionalmente) por estágio do funil. O membro recebe credenciais e faz login pelo fluxo dedicado.
**Confiança:** CONFIRMADO.

### O membro vê os dados de outros membros?
**Resposta:** Não por padrão. RLS isola por `user_id`. Membros podem acessar dados da própria agência conforme permissão concedida.
**Confiança:** CONFIRMADO.

---

## Marketing

### Como crio meu cartão de visitas digital?
**Resposta:** Em **Ferramentas de Marketing → Cartão de Visitas** ou `/criar-cartao` (wizard de 5 passos). O cartão fica acessível em `contato.tur.br` com QR Code.
**Confiança:** CONFIRMADO.

### Como publico uma vitrine de ofertas?
**Resposta:** **Minha Vitrine** (`/minha-vitrine`). Adicione itens manualmente ou use os automáticos (com overrides via drag-and-drop). Publicação em `vitrine.tur.br`.
**Confiança:** CONFIRMADO.

### Posso criar uma landing page de vendas?
**Resposta:** Sim. **Captação de Leads → Landings**, novo ou editar. URL pública em `/lp/:slug` ou `lp.vitrine.tur.br`.
**Confiança:** CONFIRMADO.

---

## Conteúdo

### Onde estão os cursos e mentorias?
**Resposta:** Menu **Conhecimento**. Cursos em `/cursos` (com checkout Stripe), mentorias em `/mentorias`.
**Confiança:** CONFIRMADO.

### Existe certificação?
**Resposta:** Sim. Trilhas da Academy emitem certificados (`user_certificates`).
**Confiança:** CONFIRMADO.

---

## Suporte e conta

### Como abro um ticket de suporte?
**Resposta:** `/suporte`. O atendimento ocorre em chat em tempo real com anexos.
**Confiança:** CONFIRMADO.

### Onde mudo meu plano?
**Resposta:** `/planos` para conhecer ou `/minha-conta` para gerenciar pelo portal do cliente Stripe.
**Confiança:** CONFIRMADO.

### Por que fui deslogado?
**Resposta:** Há timeout de 20 minutos por inatividade, com aviso 30 segundos antes.
**Confiança:** CONFIRMADO.
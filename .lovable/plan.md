# Módulo Faturas & Recibos — Gestão Financeira

Vou criar um módulo completo de **Faturas, Recibos, Cobranças e Pagamentos Recebidos** integrado a Orçamentos, Carteira Digital, Oportunidades e Operações, com geração de PDF profissional e link público.

---

## 1. Banco de dados (migração)

Novas tabelas (todas com RLS por `user_id` + GRANTs):

- **`invoices`** — Faturas
  - Identificação: `invoice_number` (auto, sequencial por agência: `FAT-2026-000123`), `issue_date`, `due_date`, `status` (`draft|sent|partial|paid|cancelled|overdue`)
  - Origem: `source_type` (`manual|quote|trip|opportunity|operation`), `source_id`
  - Cliente: `client_id`, snapshot de nome/empresa/cpf_cnpj/email/telefone
  - Viagem: `destination`, `travel_start`, `travel_end`, `passengers` (jsonb)
  - Totais: `subtotal`, `taxes_total`, `discount_total`, `commission_total`, `rav_total`, `total_amount`, `paid_amount`, `balance`, `estimated_profit`
  - Observações, termos, `public_access_code` (único), `agency_slug`
  - QR PIX opcional: `pix_key`, `pix_qr_payload`

- **`invoice_services`** — itens da fatura
  - `invoice_id`, `order_index`, `category` (aereo/hotel/cruzeiro/seguro/passeio/transfer/ingresso/pacote/outros)
  - `description`, `fare`, `taxes`, `discount`, `commission`, `rav`, `net_amount`, `final_amount`

- **`invoice_installments`** — parcelas
  - `invoice_id`, `installment_number`, `label` (Entrada/2ª/...), `amount`, `due_date`, `status` (`pending|paid|overdue`), `paid_at`

- **`invoice_payments`** — pagamentos recebidos
  - `invoice_id`, `installment_id` (opcional), `amount`, `payment_date`, `method` (pix/cartao/dinheiro/transferencia/boleto/outros), `notes`, `receipt_number` (auto), `receipt_generated_at`

- **`invoice_number_seq`** e **`receipt_number_seq`** — sequências por usuário (controladas em função PL/pgSQL)

Triggers:
- Auto-gerar `invoice_number`, `receipt_number`, `public_access_code`
- Recalcular `paid_amount`, `balance` e `status` ao inserir/atualizar/deletar pagamentos
- Marcar parcelas como `overdue` quando `due_date < now()` e não pagas (via cron leve no frontend ou função RPC)

RPC pública: `get_invoice_by_public_code(agency_slug, code)` retornando fatura + serviços + parcelas + pagamentos + perfil do agente (mesma pattern do `get_quote_by_public_code`).

## 2. Frontend — Estrutura

Em `src/pages/Financeiro.tsx`, adicionar abas no grupo principal:
- **Faturas** (lista, criar, editar)
- **Recibos** (lista derivada de `invoice_payments`)
- **Cobranças** (parcelas pendentes/vencidas, com ação de enviar cobrança WhatsApp)
- **Pagamentos Recebidos** (lista de `invoice_payments` + filtros)

Novos componentes em `src/components/financial/invoices/`:
- `InvoicesManager.tsx` — listagem com filtros (status, cliente, período)
- `InvoiceFormDialog.tsx` — modal de criação/edição com tabs (Geral, Serviços, Parcelas, Pagamentos)
- `InvoiceImportPicker.tsx` — botões "Importar de Orçamento / Carteira / Oportunidade / Operação" abrindo seletor
- `InvoiceServicesEditor.tsx` — tabela de serviços com cálculo em tempo real
- `InvoiceInstallmentsEditor.tsx` — parcelamento (único ou parcelado)
- `InvoicePaymentsList.tsx` — registrar/listar pagamentos, gerar recibo
- `ReceiptsManager.tsx`, `ChargesManager.tsx`, `PaymentsReceivedManager.tsx`
- `InvoiceDashboardCards.tsx` — adicionar KPIs no `SmartDashboard`: Total Faturado, Recebido, Pendente, Vencido, Comissão Gerada, Lucro Estimado

Hook: `src/hooks/useInvoices.ts` com React Query (list, byId, create, update, delete, addPayment, importFrom*).

Conversores em `src/utils/`:
- `quoteToInvoice.ts`, `tripToInvoice.ts`, `opportunityToInvoice.ts`, `operationToInvoice.ts`

## 3. PDF Profissional

`src/lib/generateInvoicePdf.ts` (jsPDF) e `generateReceiptPdf.ts` (reaproveitar/expandir o existente):
- Cabeçalho com logo + dados da agência
- Bloco cliente + viagem + passageiros
- Tabela de serviços com colunas (Cat | Descrição | Tarifa | Taxas | Desc | Total)
- Resumo financeiro destacado
- Parcelas com status
- Pagamentos recebidos
- Observações/termos
- QR Code PIX (lib `qrcode` — já disponível, senão instalar)
- Rodapé com link público + número da fatura

## 4. Link público

Nova rota `/fatura/:agencySlug/:code` em `App.tsx` → `src/pages/FaturaPublica.tsx`:
- Visualizar fatura, baixar PDF, ver parcelas, ver pagamentos, baixar recibos individuais
- Domínio futuro `fatura.agentesdesonhos.com.br` (precisa configurar DNS — alerto que isso é etapa manual no provedor)

## 5. Integrações

- **Orçamento → Fatura**: botão "Gerar Fatura" no `OrcamentoPublicoV2`/listagem de Quotes copiando serviços e cliente
- **Carteira → Fatura**: botão na `TripWallet` que importa `trip_services` como itens
- **Oportunidade/Operação → Fatura**: botões no `OpportunityCard` e `OperationsModule`
- **CRM**: ao registrar pagamento, atualizar `clients.last_interaction_at` e exibir badge "Valor recebido / Saldo" no perfil do cliente
- **Operações**: ao quitar fatura vinculada a operação, marcar `payment_status='pago'` automaticamente via trigger

## 6. Notas técnicas

- Sequências por usuário com fallback (`ano-corrente-000001`)
- `balance = total_amount - paid_amount` calculado por trigger
- Status auto: `paid` se balance=0; `partial` se 0<paid<total; `overdue` se due_date<hoje e balance>0
- Compartilhamento WhatsApp já segue padrão usado em quotes (template + link público)
- Permissões de Equipe: novos `permission_key` no módulo `financial`: `invoices.view`, `invoices.create`, `invoices.edit`, `invoices.delete`, `payments.register`

## 7. Escopo desta entrega

Dado o tamanho, proponho implementar em **2 fases** dentro deste loop:

**Fase 1 (esta resposta)** — Fundação:
- Migração SQL completa (tabelas + triggers + RPC pública + GRANTs/RLS)
- Hook `useInvoices.ts`
- `InvoicesManager` + `InvoiceFormDialog` com serviços, parcelas e pagamentos
- Geração de PDF da fatura e do recibo
- Importação de Orçamento e Carteira Digital
- Aba Faturas no Financeiro
- Rota e página pública `/fatura/:slug/:code`

**Fase 2 (próxima mensagem após aprovar Fase 1)**:
- Abas Recibos / Cobranças / Pagamentos Recebidos
- Importação de Oportunidade e Operação
- Botões "Gerar Fatura" nos módulos de origem
- KPIs no Dashboard Financeiro
- QR PIX
- Permissões de Equipe granulares

Confirma que posso iniciar pela **Fase 1**?

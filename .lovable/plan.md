## Nova Apresentação do Investimento no Orçamento Público (com agrupamento opcional)

### Resumo
Substituir o bloco de investimento do orçamento público pelo layout aprovado (cards "Condições de Pagamento" + card final "Investimento Total da Viagem" + rodapé financeiro), adicionando a opção de **agrupar por tipo de serviço + condição de pagamento** ou **exibir serviço por serviço**, preservando 100% dos cálculos atuais (entrada, taxas/RAV/fee, parcelas, desconto à vista, meio de pagamento, observações) e todos os orçamentos/links públicos já existentes.

---

### 1. Modelo de dados (compatibilidade)

Adicionar um novo campo de configuração no orçamento:

- Nome sugerido: `investment_summary_layout`
- Valores: `'legacy' | 'grouped' | 'ungrouped'`
- Default no banco: `'legacy'` (não impacta orçamentos antigos)
- Default no editor para **novos orçamentos**: `'grouped'`
- Migration apenas adiciona a coluna nullable com default `'legacy'`. Nenhum recálculo, nenhuma escrita em registros existentes.

Critério de renderização no público:
- `legacy` → renderiza o componente atual (intocado).
- `grouped` / `ungrouped` → renderiza o novo componente.

Isso garante os critérios 15, 16 e 17 (orçamentos antigos preservados; novo layout só após o agente abrir e salvar com a nova config).

---

### 2. Editor do agente — etapa "Apresentação do Investimento"

Arquivo provável: passo de investimento dentro de `src/components/quote/` (a confirmar na leitura). Mudanças:

- Manter intocadas as seções:
  - "O que exibir para o cliente?" (Total / Detalhado / Total+Detalhado)
  - "Como exibir o valor para o cliente?" (sem entrada / com entrada / à vista)
  - Complementos (desconto à vista, meio de pagamento, observações)

- **Nova seção** ao final: **"Como organizar os serviços no resumo financeiro?"**
  - Radio cards: `Agrupar por tipo de serviço — recomendado` | `Não agrupar, exibir serviço por serviço`
  - Visível apenas quando "O que exibir" ∈ {Detalhado, Total+Detalhado}.
  - Caso contrário, mostrar mensagem discreta: *"Esta opção fica disponível quando a apresentação inclui valores detalhados."*

- Novos orçamentos: default = `Total + Detalhado` + `grouped`.
- Orçamentos existentes abertos no editor: se `investment_summary_layout` for `legacy`/null, manter como está; quando o agente interagir com a nova seção e salvar, gravar `grouped`/`ungrouped`.

---

### 3. Novo componente público de investimento

Criar `src/components/quote/PublicInvestmentSummary.tsx` (nome a ajustar conforme convenção do projeto):

Props:
- `services` (com tipo, nome, fornecedor, total, condição de pagamento já calculada)
- `displayMode`: `total` | `detailed` | `total_and_detailed`
- `groupingMode`: `grouped` | `ungrouped`
- `paymentSummary` (total, total à vista, desconto %, meio de pagamento, observações)
- helpers de moeda existentes (não criar novos)

Renderização:
- Título **"Condições de Pagamento"** + subtítulo (variante agrupado / sem agrupamento).
- Lista de cards (grupo ou serviço) com 3 colunas: identidade (ícone + nome + qtd/fornecedor), Total do grupo/serviço, Forma de pagamento (entrada + parcelas, ou à vista).
- Card final **"Investimento Total da Viagem"** quando o modo de exibição inclui total: total, à vista com desconto (se houver), total de serviços, total de grupos (apenas no agrupado), meio de pagamento.
- Rodapé financeiro discreto com meio de pagamento + observações (oculto se ambos vazios).
- Ícones por tipo (Lucide): Plane, Building2, Ship, MapPin, Shield, Car, Ticket, TrainFront, Sparkles.
- `useMemo` para agrupamento, formatação BRL via helper atual.

Regras de agrupamento (chave de grupo):
`tipo + condição (sem entrada / com entrada / à vista) + nº parcelas + valor da entrada + meio de pagamento relevante`.
Serviços incompatíveis viram grupos separados (Critério 5).

---

### 4. Cálculos financeiros — preservar 100%

- Reutilizar as funções existentes em `src/lib/servicePayment.ts`, `src/lib/quoteCurrency.ts`, etc.
- O novo componente apenas **lê** os valores já calculados por serviço e soma dentro do grupo. Não recalcula entrada, não redistribui RAV/fee/taxas.
- A soma dos grupos === total do orçamento (mesmos helpers de arredondamento já usados).

---

### 5. Renderização condicional no OrçamentoPúblico

Em `src/pages/OrcamentoPublicoV2.tsx` (e `OrcamentoPublico.tsx` se aplicável):

```ts
if (quote.investment_summary_layout === 'grouped' || quote.investment_summary_layout === 'ungrouped') {
  <PublicInvestmentSummary ... />
} else {
  <ComponenteAtual ... />  // legacy intocado
}
```

Barra fixa inferior mobile permanece como está (apenas botão "Quero reservar", já implementado).

---

### 6. Responsividade & acessibilidade

- Cards: grid 3 colunas em ≥sm; empilhado vertical no mobile.
- Sem scroll horizontal; valores nunca truncados.
- Ícones decorativos com `aria-hidden`; cards de grupo com `aria-label` descritivo; foco visível; navegação por teclado nos radios do editor.
- Contraste via tokens do design system (sem cores hardcoded).

---

### 7. Migration (Lovable Cloud)

```sql
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS investment_summary_layout text
  DEFAULT 'legacy'
  CHECK (investment_summary_layout IN ('legacy','grouped','ungrouped'));
```
(Sem alteração de RLS/GRANTs — coluna nova em tabela já protegida.)

---

### 8. Fora de escopo (não fazer agora)

- Edição manual avançada de grupos.
- Personalização individual por grupo.
- Tela de condições híbridas.
- Recalcular qualquer valor financeiro.
- Mudar rotas públicas ou nomes de URL.

---

### 9. Validação

- Abrir orçamento antigo no preview → layout atual permanece (legacy).
- Criar novo orçamento → default Total+Detalhado + grouped → novo layout no público.
- Trocar para "Não agrupar" → cards por serviço.
- Trocar "O que exibir" para apenas Total → seção de organização some + cliente vê só total consolidado.
- Casos: parcelado sem entrada, com entrada + RAV/fee, à vista com desconto → valores idênticos aos do layout antigo.
- Responsivo 320–1920px; teste com leitor de tela nos cards.

---

### Arquivos previstos

- **Migration:** nova (adiciona coluna).
- **Editar:** passo de investimento no editor de orçamentos (em `src/components/quote/`), `src/pages/OrcamentoPublicoV2.tsx`, possivelmente `OrcamentoPublico.tsx`, `src/types/quote.ts`, `src/lib/orcamento-domain.ts` (default).
- **Criar:** `src/components/quote/PublicInvestmentSummary.tsx` (+ subcomponentes/ícones).

Confirma que posso seguir com essa abordagem? Em particular: (a) nome do campo `investment_summary_layout`, (b) default `legacy` para registros antigos e `grouped` para novos no editor, (c) criar o novo componente em paralelo ao atual sem remover o antigo.

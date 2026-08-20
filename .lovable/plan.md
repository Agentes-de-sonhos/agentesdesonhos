# Investigação read-only — "Cris está fazendo orçamento não está salvando PDF" (20/08/2026)

Nenhum código, banco ou configuração foi alterado. Abaixo: o que foi lido, o que as evidências mostram e a correção recomendada.

## 1. Fluxos de PDF do orçamento

Existe apenas **um** fluxo:

- `src/pages/GerarOrcamento.tsx:931` → `handleGeneratePDF()` → `generateQuotePDF(quote, agentProfile)`
- Acionado em dois lugares: botão da barra superior (`GerarOrcamento.tsx:1294`) e a faixa de compartilhamento `QuoteShareBar` (`onGeneratePDF`, linha 1320).
- `src/components/quote/QuotePDF.tsx:342` → `generateQuotePDF()` monta um HTML e imprime via **pop-up + `window.print()`** (não há jsPDF, não há Edge Function, não há download de arquivo).

Não há fluxo antigo/alternativo de PDF de orçamento. Outros PDFs do produto (contrato, fatura, recibo, cartão virtual, Raio-X) usam jsPDF com `doc.save()` — comportamento diferente e mais confiável.

## 2. Causa provável confirmada no código (regressão de padrão)

Fim de `generateQuotePDF` (`QuotePDF.tsx`, últimas linhas do arquivo):

```ts
const printWindow = window.open("", "_blank");   // antes dos awaits
...
if (printWindow) {
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.print(); };
}
```

Dois defeitos reais:

1. **Falha silenciosa quando o pop-up é bloqueado.** Se `window.open` retorna `null` (bloqueio de pop-up, celular, navegador in-app do WhatsApp/Instagram), o `if (printWindow)` simplesmente não executa nada: nenhum erro, nenhum toast, nenhuma janela. Do ponto de vista da usuária, "clico em Gerar PDF e não acontece nada / não salva".
2. **`onload` atribuído depois de `document.close()`.** Com `document.write` + `close()`, o evento `load` do documento pode disparar antes da atribuição do handler; nesse caso `print()` **nunca** é chamado e a janela fica parada no texto "Gerando PDF do orçamento…". Também não há espera pelas imagens, então quando imprime pode sair sem fotos.

O mesmo módulo de PDF da **Carteira Digital** já foi endurecido e não tem esses problemas (`src/components/trip/TripPDF.tsx:1505-1518`):

```ts
if (!printWindow) { toast.error("Não foi possível abrir a janela de impressão. Permita pop-ups e tente novamente."); return; }
printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
await waitForWindowImages(printWindow);
try { printWindow.print(); } catch {}
```

Ou seja: o orçamento ficou atrás da carteira. `TripPDF` ganhou `waitForWindowImages` + aviso de pop-up; `QuotePDF` (último commit `9bc1bec6`, 17/08/2026) manteve `onload` sem fallback.

Descartado como causa principal:
- **Dados não persistem antes de gerar**: `handleGeneratePDF` usa o `quote` já carregado e há bloqueios explícitos (`blockForFareReview`, `blockForFareSync`) que emitiriam toast — a usuária relatou ausência de resultado, não aviso.
- **Erro na geração por conteúdo**: `fetchQuoteDocumentsForPDF` e a resolução de imagens do Google estão em `try/catch` e degradam para vazio; não derrubam o fluxo.
- Imagens externas/CORS afetariam apenas a aparência do PDF, não o disparo.

## 3. Logs

- `app_error_logs`: **0 registros** em 20/08/2026.
- Logs de Edge Functions do horário (calendar-sync, lead-emails, import-hotel-document) não têm nada de orçamento/PDF — coerente, pois a geração é 100% no navegador e por isso **não deixa rastro no backend**. Essa é justamente a razão pela qual não há evidência server-side: o modo atual é inobservável.

## 4. Identificação da usuária/orçamento

Não é possível afirmar sem adivinhar:
- Existem **6 perfis** com nome contendo "Cris" (mascarados: `Cri***`, `CRI***`, além de agências distintas). Nenhum deles tem orçamento com `updated_at` em 20/08/2026.
- Houve **10 orçamentos** editados hoje (últimos às 21:32, 21:06, 20:59 UTC), mas nenhum vinculado aos perfis "Cris" encontrados — a "Cris" do relato pode ser colaboradora de equipe ou um nome que não está no campo `name`.

Conclusão: **alcance não é de uma conta específica** — o defeito é do código de geração e atinge qualquer usuária cujo navegador bloqueie pop-up ou dispare `load` antes do handler (mais comum em celular e navegadores in-app).

## 5. Teste de reprodução

1. Abrir um orçamento em `/ferramentas-ia/gerar-orcamento/<id>` no Chrome desktop com bloqueio de pop-ups ativo para o domínio → clicar "Gerar orçamento PDF": nada acontece, sem mensagem.
2. Mesmo orçamento em Chrome Android ou no navegador interno do WhatsApp → janela abre com "Gerando PDF do orçamento…" e o diálogo de impressão não aparece.
3. Comparar com "Gerar PDF" da Carteira Digital pública no mesmo ambiente → mostra o aviso de pop-up ou imprime corretamente.

## 6. Correção recomendada (não implementada)

Alinhar `generateQuotePDF` ao padrão já validado do `TripPDF`, em um único arquivo (`src/components/quote/QuotePDF.tsx`) mais um toast no chamador:

1. Se `window.open` retornar `null`, exibir toast: "Não foi possível abrir a janela de impressão. Permita pop-ups e tente novamente." e encerrar.
2. Substituir `printWindow.onload = ...` por: `document.open()/write/close()` → `await waitForWindowImages(printWindow)` (reutilizar o helper exportado de `TripPDF.tsx`) → `try { printWindow.print(); } catch {}`.
3. Envolver `handleGeneratePDF` (`GerarOrcamento.tsx:931`) em `try/catch` com toast de erro e estado de carregamento no botão, para nunca falhar em silêncio.
4. Opcional (fase 2): fallback sem pop-up — renderizar em `iframe` oculto na própria página e chamar `print()` nele, cobrindo navegadores in-app que bloqueiam janelas.
5. Cobrir com teste estático (padrão já usado em `src/test/hotel-gallery-integration.test.ts`) verificando que `QuotePDF.tsx` trata `!printWindow`, aguarda imagens e não usa `onload`.

Confirme e eu implemento os itens 1-3 e 5 (o item 4 só se quiser cobrir navegador in-app na mesma rodada).

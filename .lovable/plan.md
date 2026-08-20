# Conversor de moedas da Carteira Digital pública — investigação read-only

## Resumo (causa raiz confirmada)

O conversor não funciona para **ARS** porque a API usada (**Frankfurter**, que republica as taxas de referência do Banco Central Europeu) **não possui peso argentino na sua lista de moedas**. A chamada retorna **HTTP 404** e o componente cai no estado de erro. Não é bug do ARS no nosso código, nem depende da carteira criada hoje: é **limitação da integração**, e afeta igualmente **CLP (peso chileno)**, que também está no seletor.

Não houve nenhuma alteração de código, banco ou configuração nesta etapa.

## 1. Onde o conversor está implementado

- Componente: `src/components/trip/TripConverters.tsx` (função interna `CurrencyConverterDialog`).
- Usado em: `src/pages/ViagemPublica.tsx` (carteira pública) via `<TripConverters ... />`, no bloco "Ferramentas de apoio ao passageiro" (botão "Moeda").
- Fluxo: ao abrir a carteira, o destino da viagem é usado por `inferCurrency()` para pré-selecionar a moeda (`"argentina" -> ARS`); o passageiro pode trocar a moeda no `Select`, digitar o valor e inverter o sentido (BRL→moeda / moeda→BRL). A cotação é buscada por React Query com `queryKey: ["fx", target]`, `staleTime` 1h, apenas quando o modal está aberto.

## 2. Endpoint chamado

`src/components/trip/TripConverters.tsx:86`

```ts
const res = await fetch(`https://api.frankfurter.dev/v1/latest?from=${target}&to=BRL`);
if (!res.ok) throw new Error("fx");
const j = await res.json();
return j.rates.BRL as number; // 1 target = X BRL
```

- Não há Edge Function nem chave de API envolvida: é fetch direto do navegador do passageiro.
- Sempre busca `from=<moeda selecionada>&to=BRL` e converte nos dois sentidos localmente (`num * rate` ou `num / rate`).
- Tratamento de resposta: qualquer `!res.ok` vira erro genérico → UI mostra "Não foi possível carregar a cotação."
- O mesmo provedor é usado no card de câmbio do dashboard interno (`src/components/dashboard/ExchangeRateCard.tsx`), que só consulta USD e EUR — por isso nunca falhou.

## 3. O código usa ARS corretamente?

Sim. Não há mapeamento incorreto nem confusão com CLP:

- `COUNTRY_CURRENCY`: `"argentina": { code: "ARS", ... }`, `"chile": { code: "CLP", ... }` (linhas 45-46).
- `CURRENCIES`: `ARS` e `CLP` listados separadamente (linhas 64-65).
- O código ISO enviado à API é exatamente `ARS`, e o `Intl.NumberFormat` recebe `ARS` (formatação válida).

## 4. A API suporta ARS? (testes executados agora, 20/08/2026)

| Requisição | HTTP | Resposta |
|---|---|---|
| `latest?from=ARS&to=BRL` | **404** | `{"message":"not found"}` |
| `latest?from=BRL&to=ARS` | **404** | `{"message":"not found"}` |
| `latest?from=CLP&to=BRL` | **404** | `{"message":"not found"}` |
| `latest?from=USD&to=BRL` | 200 | `{"base":"USD","date":"2026-08-20","rates":{"BRL":5.1936}}` |
| `latest?from=EUR&to=BRL` | 200 | `{"base":"EUR","date":"2026-08-20","rates":{"BRL":6.0666}}` |
| `latest?from=MXN&to=BRL` | 200 | `{"base":"MXN","date":"2026-08-20","rates":{"BRL":0.30567}}` |

`GET /v1/currencies` lista 30 moedas (AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR) — **sem ARS e sem CLP**.

Não é CORS nem rate limit: o mesmo host responde 200 para USD/EUR/MXN no mesmo instante. É 404 determinístico por moeda não suportada.

## 5. Comparação dos testes

- BRL→ARS e ARS→BRL: **falham** (mesma chamada única `from=ARS&to=BRL`, 404 → estado de erro na UI).
- BRL→USD, USD→BRL, BRL→EUR, EUR→BRL: **funcionam**.
- Das 10 moedas do seletor, 8 funcionam; **ARS e CLP são as duas quebradas** (as demais — EUR, USD, GBP, JPY, CHF, CAD, AUD, MXN — constam na lista do provedor).

## 6. Logs

Não há Edge Function nesse caminho, portanto não existem logs de função para o conversor. O erro é client-side: o React Query registra a falha do fetch e o 404 aparece apenas no console/rede do navegador do passageiro. Nada é gravado em `app_error_logs`.

## 7. Depende da carteira criada hoje?

Não. O problema é **global e independente da viagem**: o único dado da carteira usado é o destino, apenas para pré-selecionar a moeda. Qualquer carteira internacional, antiga ou nova, com ARS selecionado apresenta a mesma falha. O destino "Argentina" só torna o problema mais visível porque o ARS já vem pré-selecionado.

## 8. Impacto e correção mínima proposta (não implementada)

**Impacto:** passageiros com destino Argentina (e Chile) abrem o conversor e recebem "Não foi possível carregar a cotação", sem explicação. Alto ruído para agências que vendem Bariloche/Buenos Aires/Santiago.

**Correção mínima segura, em ordem de esforço:**

1. **Provedor com cobertura de ARS/CLP** (recomendado): trocar a busca por um provedor que cubra essas moedas, mantendo o mesmo contrato interno (`1 moeda = X BRL`). Duas rotas:
   - `open.er-api.com` / `exchangerate.host` — fetch direto do navegador, sem chave, cobre ARS e CLP;
   - ou uma Edge Function `fx-rate` que consulta o provedor, valida a moeda e faz cache curto — evita expor provedor no cliente e centraliza tratamento de erro.
2. **Fallback via USD**: manter o Frankfurter para as moedas cobertas e, para ARS/CLP, buscar a taxa em um provedor secundário (cross-rate USD→ARS × USD→BRL). Mais código, mas preserva a fonte atual.
3. **Mitigação imediata (cosmética, se a correção for adiada)**: sinalizar no seletor que ARS/CLP estão temporariamente indisponíveis e exibir mensagem específica em vez do erro genérico — não resolve a conversão, só a experiência.

Em qualquer opção, a alteração fica contida em `src/components/trip/TripConverters.tsx` (e, na opção 1b, uma nova Edge Function), sem mexer em banco, RLS ou dados da carteira. Vale aplicar a mesma fonte ao `TripBudgetDialog`/`ExchangeRateCard` caso passem a oferecer ARS.

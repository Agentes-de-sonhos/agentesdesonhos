# Módulo: Orçamentos

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota interna:** `/ferramentas-ia/gerar-orcamento[/id]`. **Rota pública:** `/orcamento/:token` + domínio white-label `seuorcamento.tur.br`.
- **Objetivo:** elaborar e compartilhar propostas comerciais.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Editor multi-moeda (BRL/USD/EUR), modos Fixo ou Conversão Automática.
- Cadastro de serviços com fotos (slider responsivo), markdown, status individual de pagamento.
- Termos de pagamento por serviço sobrescrevem o global.
- Toggle para esconder investimento total.
- Introdução de destino gerada por IA com fotos do Google Places (até 5).
- Autosave em `localStorage` com indicador de status, descarte ao publicar.
- Logos ampliados e categorias com pricing dedicado.
- Open Graph público gerado por `quote-og` (sem marca da agência).

## Campos principais (INFERIDOS)
| Campo | Tipo | Obs |
|---|---|---|
| Cliente | FK | Obrigatório |
| Moeda | Enum | Não editável após criar |
| Modo de conversão | Enum (Fixo/Auto) | — |
| Serviços | Lista | Cada um com termos próprios |
| Termos globais | Texto/estruturado | Pode ser sobrescrito |
| Validade | Data | — |

## Regras de negócio
- Cliente obrigatório.
- Moeda imutável depois de criada.
- Contagem de passageiros é definida no orçamento (SOT) e reutilizada nos serviços.
- Imagens privadas usam signed URL.

## Evidências
`src/pages/GerarOrcamento.tsx`, `src/pages/OrcamentoPublico*.tsx`, `src/components/quote/*`, `src/lib/orcamento-domain.ts`, `src/lib/quoteCurrency.ts`, tabelas `quotes`, `quote_services`, `quote_documents`, Edge Function `quote-og`.
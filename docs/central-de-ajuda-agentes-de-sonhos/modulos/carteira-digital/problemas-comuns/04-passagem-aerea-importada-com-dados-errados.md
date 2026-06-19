---
id: carteira-digital-prob-04
titulo: Passagem aérea importada com dados errados
modulo: Carteira Digital
tipo: problema-comum
publico: [agente, titular]
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Carteira Digital
intencoes: [passagem aérea importada com dados errados]
palavras-chave: [problema, carteira-digital]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [carteira-digital-faq-24, carteira-digital-tut-03]
fonte-interna: src/components/trip/TripServiceForms.tsx
---

# Passagem aérea importada com dados errados

## Sintoma
A IA preencheu segmentos, horários ou valores incorretos.

## Causas possíveis
- Qualidade do PDF/imagem ruim.
- Comprovante em layout não reconhecido.
- Texto cortado ou rotacionado.

## Como verificar
1. Compare o que foi preenchido com o bilhete original.
2. Identifique quais campos vieram errados.

## Solução passo a passo
1. Ajuste manualmente os campos divergentes.
2. Salve o serviço.
3. Se a maioria estiver errada, exclua o serviço e refaça em modo **Preencher passo a passo**.

## Quando procurar suporte
Reporte ao suporte enviando o bilhete (sem dados pessoais sensíveis) para ajudar a melhorar o modelo.

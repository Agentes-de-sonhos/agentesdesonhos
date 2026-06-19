---
id: orcamentos-prob-05
titulo: Introdução de destino com IA não gera fotos
modulo: Orçamentos
tipo: problema-comum
publico: [agente, titular]
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Orçamentos
intencoes: [introdução de destino com ia não gera fotos]
palavras-chave: [problema, orcamentos]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [orcamentos-faq-12, orcamentos-tut-05]
fonte-interna: supabase/functions/generate-destination-intro/index.ts
---

# Introdução de destino com IA não gera fotos

## Sintoma
A IA escreve o texto mas nenhuma imagem aparece.

## Causas possíveis
- Campo **Destino** vazio ou genérico.
- Destino não retornou resultados no Google Places.
- Limite temporário da integração.

## Como verificar
1. Confirme se o destino está preenchido com nome reconhecível (cidade, país).
2. Tente termos mais específicos (ex.: 'Bariloche, Argentina').

## Solução passo a passo
1. Edite o destino para um nome canônico.
2. Clique novamente em **Gerar Introdução de Destino**.
3. Se ainda assim não vier foto, anexe imagens manualmente aos serviços.

## Quando procurar suporte
Se o problema for recorrente em vários orçamentos, contate o suporte com exemplos de destinos que falharam.

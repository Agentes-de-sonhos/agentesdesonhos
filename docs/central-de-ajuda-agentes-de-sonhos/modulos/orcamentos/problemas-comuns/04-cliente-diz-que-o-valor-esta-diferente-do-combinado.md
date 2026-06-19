---
id: orcamentos-prob-04
titulo: Cliente diz que o valor está diferente do combinado
modulo: Orçamentos
tipo: problema-comum
publico: [agente, titular]
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Orçamentos
intencoes: [cliente diz que o valor está diferente do combinado]
palavras-chave: [problema, orcamentos]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [orcamentos-faq-03, orcamentos-faq-13]
fonte-interna: src/lib/quoteCurrency.ts
---

# Cliente diz que o valor está diferente do combinado

## Sintoma
O cliente reporta valor diferente ao acessar o link público.

## Causas possíveis
- Modo de moeda foi alterado entre Fixo e Conversão Automática.
- Taxa de câmbio foi ajustada após envio.
- Termos individuais de serviço alteraram o cálculo.

## Como verificar
1. Verifique o modo de moeda atual.
2. Confirme a taxa de câmbio no cabeçalho.
3. Revise termos individuais de cada serviço.

## Solução passo a passo
1. Reverta as alterações se necessário.
2. Documente o motivo da diferença em **Observações Gerais**.
3. Reenvie o link ao cliente confirmando o valor correto.

## Quando procurar suporte
Se o cliente continuar contestando, gere um histórico/PDF do orçamento atual para a conversa.

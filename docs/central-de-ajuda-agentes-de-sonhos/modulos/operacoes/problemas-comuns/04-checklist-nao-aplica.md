---
id: operacoes-prob-04
titulo: Modelo de checklist personalizado não está sendo aplicado
modulo: Operações
tipo: problema-comum
publico: [titular]
nivel: intermediário
plano: não-confirmado
permissoes: gerenciar templates
intencoes: [checklist não aparece, template não aplica]
palavras-chave: [checklist, template, padrão]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [operacoes-tut-07, operacoes-faq-09]
fonte-interna: src/components/crm/operations/OperationDetailDialog.tsx
---

# Modelo de checklist personalizado não está sendo aplicado

## Sintoma
Operações novas começam sem as tarefas que você salvou como padrão para uma etapa.

## Causas possíveis
- O modelo personalizado foi removido. Quando isso acontece, aparece a mensagem **"Modelo personalizado removido. Novas operações usarão o checklist sugerido."**.
- A operação foi criada em uma etapa diferente daquela em que o checklist está salvo.

## Solução passo a passo
1. Verifique se o modelo personalizado existe para a etapa desejada.
2. Se necessário, recrie o checklist em uma operação dessa etapa e salve novamente como padrão.

## Quando procurar suporte
Se a mensagem **"Não foi possível salvar o modelo"** persistir, abra um chamado com a etapa em que isso ocorre.

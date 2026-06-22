---
id: sp-bp-02
titulo: Oculte dados sensíveis antes de enviar prints
modulo: Suporte
tipo: boas-praticas
publico:
  - titular
  - agente
  - financeiro
nivel: intermediário
plano: não-confirmado
permissoes: qualquer usuário autenticado
intencoes:
  - oculte dados sensíveis antes de enviar prints
palavras-chave:
  - boa prática
  - suporte
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Suporte.tsx | src/hooks/useSupportTickets.ts | src/types/support.ts
---
# Oculte dados sensíveis antes de enviar prints

## Por que importa
Suporte não precisa ver senha, cartão ou documento completo para resolver um problema. Ocultar esses dados protege você, seus clientes e a agência.

## Como aplicar no Agentes de Sonhos
- Antes de imprimir a tela, esconda campos com dados sensíveis.
- Recorte a imagem para mostrar só o necessário.
- Quando precisar referenciar um cliente, use o **ID** ou o **número da fatura/orçamento** em vez do CPF/documento.

## Erros que ajuda a evitar
- Vazamento de dados pessoais.
- Risco de reclamação por exposição.
- Violação de boas práticas de privacidade.

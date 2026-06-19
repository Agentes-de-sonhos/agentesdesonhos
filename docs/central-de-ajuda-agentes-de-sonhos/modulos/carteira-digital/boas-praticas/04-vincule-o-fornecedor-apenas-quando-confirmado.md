---
id: carteira-digital-bp-04
titulo: Vincule o fornecedor apenas quando confirmado
modulo: Carteira Digital
tipo: boas-praticas
publico: [titular, agente]
nivel: intermediário
plano: não-confirmado
permissoes: usar módulo Carteira Digital
intencoes: [boas práticas, carteira-digital]
palavras-chave: [boa prática, carteira-digital]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: [carteira-digital-faq-26, carteira-digital-faq-27]
fonte-interna: src/pages/TripWallet.tsx
---

# Vincule o fornecedor apenas quando confirmado

## Por que importa
Vincular fornecedor cedo demais pode poluir relatórios. O fluxo da carteira pergunta o fornecedor após salvar, justamente para ser opcional.

## Como aplicar no Agentes de Sonhos
1. Salve o serviço sem fornecedor até a operação ser confirmada.
2. Quando confirmar, edite o serviço e use o seletor no rodapé do formulário.
3. Padronize os nomes dos fornecedores em Mapa do Turismo.

## Erros que evita
- Relatórios financeiros distorcidos.
- Duplicidade de fornecedores com nomes diferentes.

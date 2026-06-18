---
id: clientes-bp-02
titulo: Evite duplicidades antes de criar um novo cliente
modulo: Gestão de Clientes
tipo: boas-praticas
publico: [agente, titular, equipe]
nivel: intermediário
plano: não-confirmado
permissoes: criar clientes
intencoes: [evitar duplicidade, pesquisa antes do cadastro]
palavras-chave: [duplicidade, pesquisa, cadastro]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-prob-03]
fonte-interna: src/components/crm/ClientsModule.tsx
---

# Evite duplicidades antes de criar um novo cliente

## Por que importa
Cada duplicidade fragmenta o histórico do cliente (viagens, oportunidades, vendas) e dificulta a operação.

## Como aplicar no Agentes de Sonhos
1. Antes de criar, pesquise pelo nome, telefone e e-mail em **Buscar clientes...**.
2. Se houver cadastro parecido, abra-o e confirme se é o mesmo cliente.
3. Em importações de planilha, compare nomes e e-mails com a base existente antes de processar o arquivo.

## Erros que evita
- Duplicação por cadastros simultâneos.
- Histórico dividido entre dois registros do mesmo cliente.

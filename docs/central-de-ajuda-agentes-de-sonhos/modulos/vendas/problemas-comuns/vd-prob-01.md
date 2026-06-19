---
id: vd-prob-01
titulo: A venda não é salva ao clicar em Salvar
modulo: Vendas
tipo: problema-comum
publico:
  - agente
  - titular
  - financeiro
nivel: iniciante
plano: não-confirmado
permissoes: usar módulo Vendas
intencoes:
  - a venda não é salva ao clicar em salvar
palavras-chave:
  - problema
  - vendas
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados:
fonte-interna: src/components/financial/*
---

# A venda não é salva ao clicar em Salvar

## Sintoma
Aparece uma mensagem de erro ou o botão fica desabilitado na etapa Revisão.

## Causas possíveis
- Campos obrigatórios em branco (cliente, vendedor ou produto sem valor).
- Sem conexão de rede.
- Sem permissão financeira no perfil.

## Como verificar e resolver
1. Revise todos os campos do wizard, em especial cliente e ao menos um produto com valor.
2. Confirme a conexão.
3. Peça ao titular para revisar suas permissões em Equipe e Permissões.

## Resultado esperado
A situação descrita deixa de ocorrer e o registro financeiro reflete a realidade.

## Quando procurar o suporte
Se o problema persistir após os passos acima, abra um ticket informando o módulo, o ID da venda/comissão envolvida e o horário. Não compartilhe senhas.

---
id: clientes-prob-01
titulo: Cliente não aparece na busca
modulo: Gestão de Clientes
tipo: problema-comum
publico: [agente, titular, equipe]
nivel: iniciante
plano: não-confirmado
permissoes: visualizar clientes
intencoes: [busca não encontra, cliente sumido]
palavras-chave: [busca, não encontra, sumiu]
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-18
artigos-relacionados: [clientes-faq-05]
fonte-interna: src/components/crm/ClientsModule.tsx
---

# Cliente não aparece na busca

## Sintoma
Você digita o nome do cliente em **Buscar clientes...** e nenhum resultado é retornado.

## Causas possíveis
- O texto digitado contém erros de digitação.
- O filtro de **Status** está restringindo a lista.
- O cliente foi cadastrado em outra conta ou por outro membro com permissões diferentes.

## Como verificar
1. Confirme a grafia.
2. Limpe o filtro de status (volte para "todos").
3. Verifique se você está logado na conta correta.

## Solução passo a passo
1. Apague o conteúdo do campo de busca.
2. Selecione **Filtrar status › todos**.
3. Pesquise novamente pelo nome ou parte do telefone/e-mail.

## Quando procurar suporte
Se o cliente realmente desapareceu após edição/importação, contate o suporte informando o nome cadastrado e a data aproximada da última visualização. Não envie documentos pessoais do cliente.

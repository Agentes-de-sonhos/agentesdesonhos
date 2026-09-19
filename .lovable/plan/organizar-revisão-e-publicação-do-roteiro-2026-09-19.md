# Organizar revisão e publicação do Roteiro

## Implementação
- Reutilizar `QuoteStepsGuide` no topo do editor com quatro etapas no rascunho e três após publicação, usando orientações em popover.
- Usar exclusivamente `currentItinerary.status === "published"` para alternar os estados antes/depois da publicação.
- Manter o fluxo atual de publicação via `PublishReviewDialog`, protegendo o acionamento repetido durante carregamento.
- Ocultar todas as ações públicas e “Salvar como modelo” antes da publicação; exibi-las somente após o status oficial atualizado.
- Ajustar “Revisar e editar roteiro” ao padrão numerado e remover o número interno de “Configurar roteiro”.
- Levar “Aprovar todas as atividades” ao cabeçalho do Dia 1, com fallback no cabeçalho da área diária quando não houver dias.

## Preservação
- Não alterar dados, regras de acesso, links, geradores, mensagens, atividades, Carteira ou Orçamento.
- Não publicar roteiro nem fazer deploy.

## Validação
- Adicionar testes focados nos dois estados, guia, aprovação global, transição de sucesso/falha e regressões.
- Rodar testes relacionados, verificação de tipos e confirmar o build automático.

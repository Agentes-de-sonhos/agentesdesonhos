# Fallback e escalonamento

## Quando responder com fallback
- Quando nenhum chunk confirmado responde à pergunta.
- Quando a resposta exige confirmação do proprietário do produto (ver `07-PERGUNTAS-PENDENTES-DE-VALIDACAO.md`).
- Quando o usuário relata um problema operacional crítico (perda de dados, fatura incorreta, dado financeiro divergente).

## Texto padrão do fallback
> Não encontrei uma orientação confirmada para essa situação na Base de Conhecimento do Agentes de Sonhos. Para evitar uma instrução incorreta, recomendo abrir um chamado no suporte.

## Quando escalar para humano
- Falhas em processamento financeiro.
- Suspeita de bug, instabilidade ou indisponibilidade.
- Dúvidas sobre conta, assinatura, cobrança ou cancelamento.
- Solicitação explícita do usuário para falar com um humano.

## Tópicos com fallback obrigatório (atualizado na Subonda 1F)
- Versão pública oficial de Roteiros (V1/V2) não confirmada.
- Fórmulas financeiras não confirmadas (faturamento previsto, fluxo de caixa, indicadores).
- Exclusão ou cancelamento com impacto financeiro (vendas, comissões, faturas).
- Permissões backend vs interface não auditadas (Equipe e Permissões).
- Dúvidas sobre limites por plano (membros de equipe, cotas de IA).
- Ações que exigem decisão do titular (excluir membros, alterar plano).
- Automações não confirmadas.
- Comportamento de IA sem quota confirmada.
- Reativação/exclusão de usuários, membros ou vendedores.
- Status de NF e impacto financeiro.

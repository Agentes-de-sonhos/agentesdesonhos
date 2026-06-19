---
id: ep-bp-04
titulo: Nunca compartilhe o login do titular
modulo: Equipe e Permissões
tipo: boas-praticas
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - nunca compartilhe o login do titular
palavras-chave:
  - boa prática
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Nunca compartilhe o login do titular

## Por que isso importa
O titular tem acesso total à conta da agência. Compartilhar credenciais impede auditoria, expõe o financeiro e dificulta investigação de incidentes.

## Como aplicar no Agentes de Sonhos
- Crie um membro próprio para cada pessoa.
- Use permissões por módulo e por etapa para entregar apenas o necessário.
- Se alguém precisar acessar algo do titular pontualmente, revise as permissões em vez de emprestar a conta.

## Erros que ajuda a evitar
- Acesso indevido a dados financeiros e da carteira de clientes.
- Confusão entre cadastros de vendedor, fornecedor e membro.
- Perda de rastreabilidade sobre quem fez cada ação.

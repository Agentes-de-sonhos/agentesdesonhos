---
id: ep-bp-01
titulo: Conceda o menor acesso necessário
modulo: Equipe e Permissões
tipo: boas-praticas
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - conceda o menor acesso necessário
palavras-chave:
  - boa prática
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Conceda o menor acesso necessário

## Por que isso importa
Liberar apenas o essencial para cada função reduz risco de erro humano, vazamento de informação e alterações indevidas em vendas e finanças.

## Como aplicar no Agentes de Sonhos
- Use o nível **Personalizado** em Gestão de Clientes sempre que possível.
- Mantenha a chave **Financeira** ativada somente para quem opera o financeiro.
- Use permissões por etapa para limitar o funil ao escopo da função.

## Erros que ajuda a evitar
- Acesso indevido a dados financeiros e da carteira de clientes.
- Confusão entre cadastros de vendedor, fornecedor e membro.
- Perda de rastreabilidade sobre quem fez cada ação.

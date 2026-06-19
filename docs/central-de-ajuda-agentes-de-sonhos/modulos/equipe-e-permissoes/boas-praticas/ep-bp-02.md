---
id: ep-bp-02
titulo: Revise as permissões periodicamente
modulo: Equipe e Permissões
tipo: boas-praticas
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - revise as permissões periodicamente
palavras-chave:
  - boa prática
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Revise as permissões periodicamente

## Por que isso importa
Funções e equipes mudam. Revisar permissões evita acessos esquecidos depois de promoções, trocas de função ou saída de pessoas.

## Como aplicar no Agentes de Sonhos
- Defina uma revisão mensal ou trimestral da lista da equipe.
- Bloqueie imediatamente quem saiu da agência.
- Documente o acesso esperado por função para comparar com o configurado.

## Erros que ajuda a evitar
- Acesso indevido a dados financeiros e da carteira de clientes.
- Confusão entre cadastros de vendedor, fornecedor e membro.
- Perda de rastreabilidade sobre quem fez cada ação.

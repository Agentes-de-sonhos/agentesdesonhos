---
id: ep-bp-03
titulo: Separe vendedor, fornecedor e membro da equipe
modulo: Equipe e Permissões
tipo: boas-praticas
publico:
  - titular
nivel: intermediário
plano: não-confirmado
permissoes: titular
intencoes:
  - separe vendedor, fornecedor e membro da equipe
palavras-chave:
  - boa prática
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Separe vendedor, fornecedor e membro da equipe

## Por que isso importa
Confundir cadastros gera erros de comissão, acesso indevido e perda de auditoria. Vendedor é financeiro; fornecedor é parceiro externo; membro é colaborador interno.

## Como aplicar no Agentes de Sonhos
- Cadastre vendedor em **Financeiro → Vendedores** apenas para cálculo de comissão.
- Cadastre fornecedor no módulo de operadores/parceiros.
- Cadastre membro em **Minha Conta → Equipe** apenas para quem precisa acessar a plataforma.

## Erros que ajuda a evitar
- Acesso indevido a dados financeiros e da carteira de clientes.
- Confusão entre cadastros de vendedor, fornecedor e membro.
- Perda de rastreabilidade sobre quem fez cada ação.

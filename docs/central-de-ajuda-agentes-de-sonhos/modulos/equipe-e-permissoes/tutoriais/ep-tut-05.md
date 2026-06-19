---
id: ep-tut-05
titulo: Redefinir a senha de um membro
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - redefinir a senha de um membro
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Redefinir a senha de um membro

## O que você fará
A senha anterior deixa de funcionar e o membro precisa usar a nova no próximo login.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Edite o membro em **Minha Conta → Equipe**.
2. Preencha **Nova senha** e **Confirmar** (mínimo 6 caracteres).
3. Clique em **Salvar**.

## Resultado esperado
A senha anterior deixa de funcionar e o membro precisa usar a nova no próximo login.

## Atenção
Combine a troca com o membro antes de salvar para evitar bloqueios inesperados.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)

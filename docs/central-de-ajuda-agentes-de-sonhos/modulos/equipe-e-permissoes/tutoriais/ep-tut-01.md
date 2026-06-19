---
id: ep-tut-01
titulo: Cadastrar um membro da equipe
modulo: Equipe e Permissões
tipo: tutorial
publico:
  - titular
nivel: iniciante
plano: não-confirmado
permissoes: titular ou perfil com acesso a Equipe
intencoes:
  - cadastrar um membro da equipe
palavras-chave:
  - tutorial
  - equipe e permissões
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-19
artigos-relacionados: []
fonte-interna: src/components/team/* | src/lib/teamPermissions.ts | src/contexts/TeamSessionContext.tsx | src/hooks/useTeamMembers.ts | supabase/functions/team-*
---

# Cadastrar um membro da equipe

## O que você fará
O membro passa a aparecer na lista da equipe e já pode entrar com o login criado.

## Antes de começar
- Estar logado com perfil **Titular**.
- Acessar **Minha Conta → Equipe**.

## Passo a passo
1. Acesse **Minha Conta → Equipe**.
2. Clique em **Novo usuário**.
3. Preencha **Nome completo**, **Cargo / Função**, **Login** e **Senha** (mínimo 6 caracteres).
4. Defina o nível de acesso a **Gestão de Clientes** (Sem acesso, Acesso total ou Personalizado).
5. Ative a chave **Gestão Financeira — Acesso total**, se necessário.
6. Ajuste **permissões por etapa** no funil de Oportunidades e Operações, se aplicável.
7. Clique em **Cadastrar**.

## Resultado esperado
O membro passa a aparecer na lista da equipe e já pode entrar com o login criado.

## Atenção
Confirme se há quota disponível (ex.: 2/3) antes de cadastrar.

## Problemas comuns
Consulte os artigos da pasta **problemas-comuns** do módulo.

## Próximos passos
- [Perguntas frequentes](../faq/00-perguntas-frequentes.md)

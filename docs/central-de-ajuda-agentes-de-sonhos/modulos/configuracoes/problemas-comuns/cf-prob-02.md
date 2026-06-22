---
id: cf-prob-02
titulo: Logotipo não aparece nas páginas públicas
modulo: Configurações, Conta e Onboarding
tipo: problema-comum
publico:
  - titular
  - agente
nivel: iniciante
plano: não-confirmado
permissoes: depende do perfil
intencoes:
  - logotipo não aparece nas páginas públicas
palavras-chave:
  - Logotipo não aparece nas páginas públicas
  - problema
status: pronto
confianca: confirmado
ultima-revisao: 2026-06-22
artigos-relacionados: []
fonte-interna: src/pages/Perfil.tsx | src/pages/MinhaConta.tsx | src/pages/Onboarding.tsx | src/pages/Atualizacoes.tsx | src/components/profile/AgencyBrandColorCard.tsx | src/hooks/useAuth.tsx | src/hooks/useSubscription.ts
---
# Logotipo não aparece nas páginas públicas

## Sintoma
O logotipo foi atualizado em **Perfil**, mas não aparece em orçamento, roteiro, carteira, cartão ou fatura pública.

## Causas possíveis
- O link público foi gerado antes da troca.
- O arquivo enviado é muito pequeno ou está corrompido.
- Cache do navegador no link público.

## Como verificar
1. Confirme se o novo logotipo aparece em **Perfil → Dados da Agência**.
2. Gere um novo link público de teste e compare.
3. Tente abrir o link em janela anônima.

## Solução
1. Reenvie um logotipo em PNG com bom contraste.
2. Para links já criados, regenere o conteúdo no módulo correspondente.

## Quando procurar suporte
Se o logotipo não aparecer em nenhum link novo, abra um chamado em **Suporte** com prints e o nome do arquivo enviado.

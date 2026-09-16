# Botão "Maximizar" na tela antiga do CRM (/crm)

## Status: o problema persiste (confirmado por leitura de código)

## Evidências
- `src/App.tsx:346` mantém a rota `/crm` ativa, renderizando `src/pages/CRM.tsx`.
- `src/pages/CRM.tsx` monta `KanbanBoard` diretamente, sem `KanbanMaximizeProvider` e sem `KanbanMaximizeSurface`.
- `src/components/crm/KanbanBoard.tsx:120` consome `useKanbanMaximize()`. Sem provedor, o contexto usa os valores padrão de `KanbanMaximizeContext.tsx:14-21`, onde `toggle` é uma função vazia. O clique realmente não faz nada, e o rótulo nunca muda para "Minimizar".
- A tela nova `src/pages/GestaoClientes.tsx:76-98` envolve as abas em `KanbanMaximizeProvider` + `KanbanMaximizeSurface`, por isso "Maximizar" funciona em Oportunidades, Operações e Clientes.
- Nenhum menu aponta para `/crm`: sidebar mobile, barra inferior e navegação direta usam `/gestao-clientes/...` (`MobileSidebar.tsx:177-181`, `BottomNavBar.tsx:60-64`, `directNavItems.ts:27`). A rota segue acessível por URL/histórico/abas salvas e tem permissão declarada (`routePermissions.ts:39`).

## Causa
Falta do provedor de contexto na página antiga. Não é bug do botão nem do mecanismo de tela cheia — é ausência de `KanbanMaximizeProvider`/`Surface` em `/crm`. Sem interferência nos botões das telas novas, que compartilham o mesmo contexto por página.

## Impacto atual
Baixo. A tela `/crm` é legada, não aparece em menus, e o único efeito é um botão inerte. Nenhuma perda de dados, permissão ou funcionalidade do funil.

## Recomendação
Corrigir com a mudança mínima (envolver o conteúdo de `/crm` com provedor + superfície) e manter a rota como fallback legado. Não descontinuar agora: abas de workspace salvas e links antigos ainda podem levar usuários para lá.

## Plano de correção (curto)
1. Em `src/pages/CRM.tsx`, envolver o conteúdo das abas com `KanbanMaximizeProvider` e `KanbanMaximizeSurface`, sem registrar slot de toolbar (o `KanbanToolbarSlot` já tem fallback inline quando não há slot).
2. Não alterar `KanbanBoard`, `ClientsManager`, contexto, superfície nem a tela nova.
3. Testes: teste de componente/arquivo confirmando que `/crm` monta provedor e superfície; teste de interação garantindo que o rótulo alterna Maximizar → Minimizar e que a superfície recebe `data-maximized="true"`; reexecutar `kanban-maximize-toast-host.test.tsx` e `crm-toolbar-layout.test.tsx` como regressão.
4. Rodar suíte afetada, typecheck e build. Sem migração, sem publicação.

## Critérios de aceite
- Em `/crm`, clicar em "Maximizar" expande o funil em tela cheia e o rótulo passa a "Minimizar"; Esc e "Minimizar" restauram.
- Toasts e modais continuam visíveis no modo maximizado (host compartilhado já cobre isso pela superfície).
- Telas de `/gestao-clientes/*` permanecem idênticas.

## Riscos
- Baixos: mudança apenas de apresentação numa página legada.
- Pontos de atenção: overlays do Radix passam a usar a superfície como container quando maximizado; `Esc` do modo maximizado pode competir com fechamento de diálogo; rolagem do body é travada enquanto maximizado. Todos já são o comportamento vigente na tela nova.

## Esforço
Muito baixo (uma alteração de poucas linhas + testes focados).

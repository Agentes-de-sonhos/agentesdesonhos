# Desativação segura da rota legada /crm

## 1. Referências reais encontradas
- `src/App.tsx:70` — `const CRM = lazy(() => import("./pages/CRM"))`.
- `src/App.tsx:346` — `<Route path="/crm" element={<CRM />} />`.
- `src/pages/CRM.tsx` — única página que usa a rota; monta `KanbanBoard` + `ClientsManager` em abas próprias, sem o provedor de maximização.
- `src/lib/routePermissions.ts:39` — `{ prefix: '/crm', any: ['clients.view'] }`.
- `src/workspace/routeTitle.ts:36` — título `"/crm": "CRM"` (usado para nomear abas internas do workspace).
- Testes: `src/test/dashboard-container.test.ts:45` valida o container de `src/pages/CRM.tsx`; `src/test/app-version-context.test.ts:55` usa a URL `/crm` apenas como cenário de navegação; `src/test/workspace-tabs.test.ts` e `workspace-home-navigation.test.ts` usam `/crm` como caminho genérico de abas.
- Documentação: `docs/base-conhecimento-agentes-de-sonhos/modulos/crm.md`, `docs/central-de-ajuda.../03-MAPA-DE-MODULOS.md` e a base RAG (`rag/BASE-RAG.jsonl`, artigos `crm-visao-geral` e `crm-primeiros-passos`) ainda dizem "Acesso em /crm".
- Não há nenhum link de menu, botão, redirect, notificação, e-mail, Edge Function ou link público apontando para `/crm`. Menus usam `/gestao-clientes/*` (`AppSidebar`/`MobileDrawerMenu` via `directNavItems.ts:27`, `MobileSidebar.tsx:177-181`, `BottomNavBar.tsx:60-64`).

## 2. Destino equivalente correto
`/gestao-clientes/funil` (aba "Oportunidades" da tela atual). Não existe `/gestao-clientes/oportunidades`; as abas reais são `funil`, `operacoes`, `clientes`, `dashboard`, `metas` (`GestaoClientes.tsx:58`). `/gestao-clientes/funil` também é o destino do menu principal e o default quando nenhuma aba é reconhecida.

## 3. Reuso de componentes
- `KanbanBoard` é compartilhado com `/gestao-clientes` — deve permanecer.
- `ClientsManager` (`src/components/crm/ClientsManager.tsx`) é importado somente por `src/pages/CRM.tsx`. A tela atual usa `ClientsModule`. Ou seja, ficaria órfão, mas é o único candidato a remoção futura — e a recomendação é não apagá-lo nesta rodada.
- `src/pages/CRM.tsx` não é importado por nenhum outro fluxo além da rota `/crm`.

## 4. Comparação das alternativas
- **Remover a rota (404):** quebra favoritos e abas internas salvas; usuário cai no NotFound sem explicação. Não recomendado.
- **Redirecionar para o CRM atual (recomendado):** substituir o elemento da rota por `<Navigate to="/gestao-clientes/funil" replace />`. Favoritos e links antigos continuam funcionando e levam à tela certa; nenhuma permissão nova é exigida (o guard já protege o destino por `opportunities.view`). Custo mínimo e reversível.
- **Manter arquivo e bloquear acesso:** mesmo efeito prático do 404, com código morto; sem vantagem.

## 5. O que sai agora e o que fica
Sai agora:
- O `element={<CRM />}` da rota `/crm`, trocado por redirecionamento.
- O import lazy de `./pages/CRM` em `App.tsx`.
- A entrada `/crm` de `routePermissions.ts` (o destino já tem regra própria).

Fica (ainda compartilhado ou de baixo risco):
- `KanbanBoard`, `KanbanMaximizeContext`, `KanbanMaximizeSurface`, `KanbanToolbarSlot` — usados pela tela atual.
- `src/pages/CRM.tsx` e `ClientsManager.tsx` — conservados um ciclo como reserva; remover só depois de o redirecionamento rodar em produção sem reclamações.
- Título `"/crm"` em `routeTitle.ts` — mantido para nomear abas antigas já salvas antes do redirecionamento.
- Documentação e base RAG: atualizar o texto de acesso de `/crm` para `/gestao-clientes/funil` (edição textual, sem mexer em IDs de artigos).

## 6. Testes e critérios de aceite
Testes:
- Novo teste de rota: renderizar `/crm` no router e confirmar redirecionamento para `/gestao-clientes/funil` com `replace` (sem entrada extra no histórico).
- Teste de referência: `App.tsx` não importa mais `pages/CRM` e a rota não renderiza a página antiga.
- Ajustar `src/test/dashboard-container.test.ts` para não exigir mais o container em `src/pages/CRM.tsx`.
- Regressão: `workspace-tabs`, `workspace-home-navigation`, `app-version-context`, `routePermissions` e `crm-toolbar-layout`.
- Rodar suíte afetada, typecheck e build. Sem migração, sem publicação.

Aceite:
- Abrir `/crm` leva direto a Oportunidades da tela atual, com o botão Maximizar funcionando.
- Colaborador sem `opportunities.view` vê a tela de permissão do destino, não erro.
- Voltar no navegador não volta para `/crm` em loop.
- `/gestao-clientes/*` inalterada.

## 7. Riscos e esforço
Riscos baixos: o único ponto de atenção é loop de redirecionamento se o destino for digitado errado, e abas internas salvas cujo título "CRM" passa a abrir Oportunidades (comportamento desejado). Sem impacto em modais, toasts, responsividade ou atalhos.

Esforço: muito baixo — poucas linhas em `App.tsx`/`routePermissions.ts`, um teste novo e um ajuste de teste existente, mais revisão textual da documentação.

## Recomendação
Descontinuar o acesso a `/crm` por redirecionamento permanente interno para `/gestao-clientes/funil`, mantendo os arquivos por um ciclo antes de excluí-los.

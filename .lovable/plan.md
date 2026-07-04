# MVP — Workspace com Abas (MDI) para Administradores

Como o próprio pedido determina, apresento a estratégia antes de implementar. Este MVP introduz uma camada de navegação sobre o app atual, sem tocar em regras de negócio, formulários, APIs ou banco. As páginas continuam funcionando como hoje quando a feature está desligada.

## 1. Estratégia técnica

### Princípio central: "keep-alive por CSS"
React Router desmonta o componente da rota anterior ao navegar — o estado (form, scroll, filtros, paginação, seleção) é perdido. Para preservar estado sem reescrever cada página, todas as abas ficam **montadas simultaneamente** em memória; apenas a aba ativa é visível. Abas inativas ficam com `display: none` (não `unmount`), o que preserva:

- estado interno de todos os componentes React;
- scroll position (via `overflow` no container de cada aba);
- estado do React Query, contextos e hooks;
- inputs não controlados e uploads em progresso.

### Isolamento de navegação por aba
Cada aba renderiza um `<MemoryRouter>` próprio contendo a mesma árvore de `<Routes>` da app. Assim:

- clicar em um link dentro da aba navega **dentro daquela aba**, sem afetar as outras;
- o botão "voltar" do navegador não vaza de uma aba para outra;
- a URL do navegador reflete a aba ativa via `history.replaceState` (sem disparar navegação real), permitindo compartilhar/atualizar links.

O `BrowserRouter` externo continua existindo apenas para: rotas públicas, `/auth`, e a rota-âncora do Workspace (`/*` quando ativo para admin).

### Interceptação do menu lateral
Um `WorkspaceContext` expõe `openTab(path, title)`. O `AppSidebar`/`MobileDrawerMenu` detectam se o Workspace está ativo:

- **ativo:** `onClick` chama `openTab` (nova aba ou foca existente se path idêntico — sem "prevenir duplicadas", apenas reaproveita o clique idempotente);
- **inativo:** comportamento atual (NavLink normal).

Nada muda para usuários não-admin ou com a flag desligada.

### Feature flag
Duas camadas AND:

1. `useUserRole().isAdmin === true`;
2. flag `workspace_tabs_enabled` — lida de `localStorage` (default `false`) com um toggle no header (só admins veem). Fácil de ligar/desligar sem deploy.

Nenhum código do Workspace executa se qualquer camada for falsa; o app renderiza como hoje.

## 2. Componentes novos

```text
src/workspace/
├── WorkspaceProvider.tsx    Context + reducer (tabs, activeId, openTab, closeTab, setActive)
├── WorkspaceShell.tsx       Layout: TabBar em cima + área de conteúdo com todas as abas montadas
├── TabBar.tsx               Barra horizontal, aba ativa destacada, botão X por aba, contador (n/10)
├── TabPane.tsx              Wrapper por aba: MemoryRouter + Routes + display:none quando inativa
├── useWorkspaceNavigate.ts  Hook que retorna openTab quando Workspace ativo, senão navigate
└── featureFlag.ts           isWorkspaceEnabled(user, role) + get/set localStorage
```

## 3. Componentes alterados (mínimo)

- `src/App.tsx` — envolve as rotas protegidas em `<WorkspaceProvider>`; quando a flag está ativa para admin, renderiza `<WorkspaceShell>` no lugar do `<DashboardLayout>` externo (o DashboardLayout continua sendo usado dentro de cada aba, sem mudanças).
- `src/components/layout/AppSidebar.tsx` e `MobileDrawerMenu.tsx` — usa `useWorkspaceNavigate` no `onClick` dos itens. Fallback total ao NavLink atual quando flag off.
- Um toggle no header (`DashboardLayout` header slot) visível apenas para admin: "Abas ligado/desligado".

Nenhuma página (`src/pages/*`), nenhum formulário, nenhum hook de dados, nenhuma rota, nenhum tipo, nenhuma tabela, nenhuma edge function é alterada.

## 4. Regras do MVP

- Máximo 10 abas — botão "Nova aba" desabilita e toast "Limite de 10 abas".
- Cada aba: título (derivado do label do menu clicado), ícone opcional, botão fechar (X).
- Fechar a aba ativa foca a aba à esquerda; fechar a última volta ao dashboard normal.
- Indicação visual da aba ativa: fundo `bg-background`, borda superior `border-primary`, demais em `bg-muted`.
- Sem duplicate-prevention, sem drag, sem pin, sem persistência (conforme escopo).

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Componentes que assumem "só existe uma instância" (ex.: singletons de modal global, atalhos de teclado, listeners de `window`) podem colidir entre abas | Auditar `GlobalPopupModal`, `MonthlyPopupModal`, `SessionTimeoutModal`, `ChatFloatingButton` — mover para fora do TabPane (renderizar 1x no Shell). Já ficam naturalmente fora se DashboardLayout for usado só dentro da aba. |
| MemoryRouter isolado quebra deep-links de sub-rotas dentro da aba (`/orcamentos/:id`) para links externos | URL do browser é sincronizada com a aba ativa via `replaceState`. Ao abrir uma URL diretamente, ela vira a primeira aba. |
| Uploads/websockets em abas inativas continuam rodando (efeito colateral esperado, mas pode surpreender) | Documentar. É comportamento MDI padrão (Photoshop, VSCode). |
| Toasts globais de aba inativa aparecem sem contexto visual | `sonner` já é global; aceitável no MVP. |
| Realtime/Supabase subscriptions duplicadas ao abrir a mesma tela em 2 abas | Sem prevenção de duplicatas no MVP — usuário assume o custo. Documentado. |
| Confusão com o botão "voltar" do browser | Botão voltar age na aba ativa (MemoryRouter interno emite `popstate` simulado). Fora do escopo do MVP prevenir 100%. |

## 6. Impacto de performance

- **Memória:** N árvores React montadas simultaneamente. Cada página média do app pesa ~2–8 MB de heap. Com teto de 10 abas: pico estimado 30–80 MB extras. Aceitável em desktop admin.
- **Rede:** cada aba faz seus próprios fetches na 1ª renderização. React Query cache é compartilhado (mesmo `QueryClient`), então dados repetidos são deduplicados.
- **CPU:** abas inativas ficam com `display:none`; React não re-renderiza sem props/estado mudando, mas timers/subscriptions continuam. Zero impacto perceptível para <10 abas.
- **Bundle:** +~4 KB gzip (workspace/*). Sem novas dependências.

## 7. Vantagens x desvantagens

**Vantagens**
- Zero mudança em páginas, hooks, RLS, tipos. Reversível apagando `src/workspace/` e revertendo 3 arquivos.
- Preserva 100% do estado (form, scroll, filtros) sem `useMemo`/serialização por página.
- Feature flag dupla (role + localStorage) — pode desligar em 1 clique.
- Não afeta usuários não-admin nem SEO/rotas públicas.

**Desvantagens**
- MemoryRouter por aba adiciona uma camada de indireção — devs precisam entender que "voltar" e URLs se comportam por aba.
- Abas inativas consomem memória (aceito).
- Subscriptions realtime podem duplicar (aceito no MVP).
- Sincronização URL ↔ aba ativa é aproximada (`replaceState`), não é uma rota real do BrowserRouter.

## 8. Alternativas consideradas (e por que não)

- **Serialização de estado por rota (`useMemo` + storage):** exigiria tocar em cada página. Viola "não alterar componentes internos".
- **`<iframe>` por aba:** isola tudo mas quebra contextos globais (auth, toast, query client) e dobra bundles.
- **`react-activation` / `<KeepAlive>`:** biblioteca de terceiros, hacks com Fiber, incompatibilidades com React 18 concurrent.
- **Múltiplas janelas do navegador:** já funciona hoje sem MDI; não atende ao pedido.

## 9. Entregáveis do MVP após aprovação

1. `src/workspace/*` (6 arquivos acima).
2. Toggle admin no header (`DashboardLayout`).
3. Interceptação nos itens de menu do `AppSidebar` e `MobileDrawerMenu`.
4. Envelope no `App.tsx`.
5. Teste manual roteirizado (abrir 3 telas, preencher form em cada uma, alternar, verificar preservação, fechar, atingir limite 10).

Nada é implementado até você aprovar esta abordagem.

# SiteLab /gestao autenticado: eliminar o router/workspace duplicado

## Causa raiz (confirmada por leitura)

Em host de plataforma, `/sitelab-base/gestao/*` é uma rota declarada dentro de `src/App.tsx`, ou seja **dentro** de `WorkspaceGate`.

- `WorkspaceGate` (src/workspace/WorkspaceGate.tsx) decide a superfície de router:
  - workspace elegível → `WorkspaceProvider` + `WorkspaceShell`, e o `WorkspaceShell` monta cada aba num router próprio (`HomeTabRouter` para a aba fixa, `MemoryRouter` para as demais);
  - workspace desligado → `BrowserRouter`.
  Em qualquer dos dois casos existe **um router ativo** acima das `Routes`.
- Antes do login, a conta não é elegível e nada quebra. Depois do login, a conta técnica do SiteLab é `premium`, `isWorkspaceEligible` passa a `true`, e o gate externo monta `WorkspaceProvider` + `WorkspaceShell` + `HomeTabRouter`.
- `AgencyAdminArea` → `AgencyAdminEntry` → `AgencyAdminShell` → `AgencyAdminWorkspace` monta **um segundo** `WorkspaceProvider` + `WorkspaceShell`, que por sua vez monta `HomeTabRouter`/`MemoryRouter`.
- React Router lança invariant para `Router` dentro de `Router`; em produção a mensagem é removida, o que explica o registro em `app_error_logs` de `react-render` sem mensagem, com stack passando por `AgencyAdminArea` e pelos componentes de workspace, e a tela do `ErrorBoundary`.

A correção anterior tratou apenas o `BrowserRouter` do ramo `/gestao/login` (`mount.base` presente → render direto). O ramo autenticado continua duplicando router **e** workspace. Nos domínios próprios não há bug: `AgencyDomainRoutes` já decide o painel **antes** do `BrowserRouter`.

## Desenho recomendado (mesma estratégia já validada nos domínios)

Reproduzir para o SiteLab exatamente o padrão de `AgencyDomainRoutes`: **decidir a gestão do laboratório antes de qualquer router do App**, em vez de tentar adaptar o painel para viver dentro de um router externo.

```text
App
├─ QueryClient / Tooltip / Toaster / ErrorBoundary        (sem router)
├─ se pathname começa com /sitelab-base/gestao
│    └─ SiteLabAdminEntry  → AgencyAdminArea(basePath=/sitelab-base)
│         └─ único WorkspaceProvider + WorkspaceShell + routers de aba
└─ caso contrário
     └─ AgencyDomainGate → Auth/Team/Subscription → WorkspaceGate → Routes
          └─ /sitelab-base, /sitelab-base/area-do-cliente (SiteLabRoot como hoje)
```

Consequências: exatamente **um** workspace/router ativo; o painel do SiteLab passa a ser byte-a-byte o mesmo caminho de código dos domínios de agência (mesmo menu lateral, mesmas abas, mesmas páginas, mesmo guard); domínios próprios não são tocados; prefixo, senha do laboratório e redirects de login continuam iguais porque `agencyAdminMount('/sitelab-base')` já resolve tudo.

Como esse ramo fica fora do router, a "chrome" do laboratório (gate de senha, barra superior com as três visões, botão sair) precisa ser reutilizada em versão router-free: os links da barra passam a ser `<a href>` (navegação real de página, que já é o comportamento esperado ao trocar de visão) em vez de `<Link>`.

## Arquivos a alterar

1. `src/pages/sitelab/SiteLabChrome.tsx` (novo) — extrai de `SiteLabRoot.tsx`, sem mudar aparência: `useNoIndex`, `PasswordGate`, `SiteLabTopBar` (com prop para link como `<a>` ou `<Link>`), hook do modelo (`get_sitelab_template` + logo/paleta via `useAgencyBrandTheme`) e `demoInfo`.
2. `src/pages/sitelab/SiteLabAdminEntry.tsx` (novo, ~40 linhas) — router-free: aplica gate de senha + barra superior e renderiza `<AgencyAdminArea hostname={model.adminHostname} basePath={SITELAB_BASE_PATH} />` em `Suspense`.
3. `src/pages/sitelab/SiteLabRoot.tsx` — passa a consumir a chrome extraída; mantém `site` e `clientArea`; o ramo `admin` deixa de existir aqui (ou apenas redireciona, já que a rota nem chega mais).
4. `src/lib/sitelabModels.ts` — exporta helper central `isSiteLabAdminPath(pathname)` (prefixo `${SITELAB_BASE_PATH}/gestao`), análogo a `isAgencyAdminPath`.
5. `src/App.tsx` — ramo de saída antecipado usando esse helper, acima de `AgencyDomainGate`/`WorkspaceGate`; remove as duas rotas `/sitelab-base/gestao` e `/sitelab-base/gestao/*` de `Routes`.
6. `src/components/whitelabel/admin/AgencyAdminArea.tsx` — o ramo de login volta a poder usar `BrowserRouter` também com `basePath` (agora não há router externo). Alternativa mais conservadora: manter como está, já que `AgencyAdminLogin` não usa hooks de router; decidir no diff, com teste cobrindo o caminho escolhido.
7. Nenhuma mudança em `WorkspaceGate`, `WorkspaceShell`, `HomeTabRouter`, `AgencyAdminPages`, `AgencyAdminWorkspace`, `AgencyDomainRoutes`, dados, RLS ou tokens de marca.

## Testes

Novo `src/test/sitelab-gestao-runtime.test.tsx` (jsdom + @testing-library/react, padrão já usado em `agency-preview-gate-runtime.test.tsx`), com `supabase` mockado (RPCs `get_sitelab_template`, `get_agency_domain`, `get_agency_admin_portal`, `agency_admin_access_check`) e sessão autenticada falsa:

1. monta de fato a árvore autenticada de `/sitelab-base/gestao` e afirma que **nenhum** erro de render ocorre (sem "You cannot render a `<Router>` inside another `<Router>`", sem fallback do `ErrorBoundary`) e que o shell real do painel aparece;
2. conta que existe exatamente **um** `WorkspaceProvider` ativo (via spy no módulo do provider ou contador exposto no teste);
3. `/sitelab-base/gestao/reservas` e reload preservam o prefixo e caem no painel (não em `/gestao` real);
4. `/sitelab-base/gestao/login` renderiza o formulário sem erro;
5. `/sitelab-base` e `/sitelab-base/area-do-cliente` continuam dentro do router do App;
6. ajuste/manutenção de `sitelab-gestao-login.test.ts` e `sitelab-shared-parity.test.tsx` para o novo ponto de montagem.

Além disso: teste focado, suíte relacionada, `tsgo --noEmit`, build e inspeção visual desktop/mobile via Playwright no preview autenticado.

## Riscos

- **Providers**: fora do `WorkspaceGate` não existem `AuthProvider`/`TeamSessionProvider`/`SubscriptionProvider` do App; `AgencyAdminArea` já monta os três internamente, então o painel fica completo — risco baixo, coberto pelo teste runtime.
- **Componentes globais** (`ImpersonationBanner`, `NewLeadAlertProvider`, guards de rota da plataforma) não envolvem mais a gestão do laboratório. É o mesmo que já ocorre nos domínios das agências, e é desejável (nenhuma marca Agentes de Sonhos dentro do template).
- **Barra superior do laboratório** passa a navegar com recarga real entre as três visões; a senha continua válida pela sessão de até 8h.
- **Ordem de rotas**: o ramo antecipado é decidido por `window.location.pathname`, então precisa ser feito antes de qualquer catch-all; o helper central evita divergência de prefixo.
- Alternativa descartada como remendo: fazer `AgencyAdminArea` renderizar `AgencyAdminPages` sem workspace quando embutido — resolveria o crash com menos código, mas quebraria a paridade de abas exigida.

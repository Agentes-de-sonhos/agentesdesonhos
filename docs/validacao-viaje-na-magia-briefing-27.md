# Viaje na Magia Turismo — briefing-27-v1

URL: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-27-v1

## Isolamento
- Fixture local em `adsBriefingPreview.ts`, com hostname sintético exato `briefing-27-v1.preview.local`, UUID sintético, slug vazio e public_slug nulo. O cadastro existente informado no briefing não é usado nem alterado.
- Engine única: `buildGoldStandardProfile`, `AgencySiteLayout`, `AgencySiteHome` e catálogos compartilhados. Nenhum projeto, tenant, conta ou engine clonado.
- Entrada deste job antes de AuthProvider, AgencyDomainGate, SubscriptionProvider e WorkspaceGate. BrowserRouter próprio somente nesta entrada isolada, sem gestão.
- Allowlist compartilhada de apresentações completas: preview deste projeto, localhost e 127.0.0.1; demais hosts recusados. `noindex,nofollow`. Não cria senha nem altera acesso.
- `strictBackendBlock` opt-in bloqueia também as exceções de avaliações Google/Club Med deste rascunho. Interceptação de formulários, links externos e window.open; hook de pedidos recusa `.preview.local` antes de invocar serviço.
- Nenhuma consulta/escrita de banco, mudança de RLS/gates/acesso/cobrança, deploy, publicação ou associação de domínio.

## Inventário e mídia
- Hero (3 slides), central (8 serviços), assinatura com continuação, especialidades (6 campanhas), Orlando completo, visto ilustrativo, destinos (5), perfis (3), resorts e catálogo completo, cruzeiros, história (3 parágrafos), diferenciais (4), atendimento (4 etapas + 4 cards), FAQ (7), rodapé.
- Conteúdo factual exclusivamente do briefing; sem avaliações, certificados, Cadastur, redes sociais, CNPJ ou domínio inventados. Portugal/DMC, blog, ofertas e newsletter não atribuem serviços/conteúdo não informados.
- Especialidades usam o rail compartilhado em vez do destaque Xcaret substitutivo; catálogo Xcaret permanece acessível no submenu com mídia genérica autorizada e sem certificados/pessoas das referências.
- Fotografias pelos slots existentes `orlandoMagicKingdom`, `parques`, `heroSantoriniShip`, `cruzeiro`, `europa`, `mendoza`, `heroVarenna`; acervo e créditos compartilhados preservados. Não foram buscadas imagens novas nem usadas fotos pessoais das referências.
- Logo fornecido armazenado por pointer CDN; favicon quadrado proporcional em `public/viaje-na-magia/favicon.png`, registrado somente para o host sintético. Favicon global e outros tenants intactos.
- Paleta: #164f76 / #ffffff / #E3EAEF (terciária pelo derivador compartilhado).

## Validação e limitações
- 26 testes aprovados: fixture, identidade sintética, cores, ausência de fatos não autorizados, allowlist, bloqueio independente do hook, formulários, links e todos os endpoints (inclusive as antigas exceções públicas), mais navegação compartilhada de catálogos.
- Playwright localhost: desktop 1280×1800 e celular 390×844, título e todas as seções presentes, FAQ expandida, janela de solicitação aberta; zero requests de auth/rest/functions e zero erros de execução. Sem overflow horizontal.
- Solicitação é deliberadamente bloqueada, inclusive o avanço por submit. Não há confirmação nem recebimento no CRM.
- Mídias CDN não foram entregues no localhost; logo e algumas fotos não puderam ser conferidos renderizados. Sem substituir por cópias/URLs externas.
- URL hospedada redirecionou para login Lovable; acesso exige sessão/permissão vigente do projeto. Não houve alteração de visibilidade. A renderização das mídias hospedadas permanece não verificada.
- Compilação automática: última entrada `build OK`.
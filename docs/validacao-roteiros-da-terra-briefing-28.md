# ROTEIROS DA TERRA — briefing-28-v1

## Entrega
- Única fixture local: `briefing-28-v1`, host sintético `briefing-28-v1.preview.local`, UUID sintético `00000000-0000-0000-0000-00000000ad28`, slugs vazios; nenhuma conta real usada.
- URL: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-28-v1
- Perfil construído por `buildGoldStandardProfile`, renderizado por `AdsBriefingPreview`, `AgencySiteLayout` e `AgencySiteHome`; sem duplicar páginas, componentes ou rotas compartilhadas.
- Identidade azul/rosé e terciária derivada pelo contrato compartilhado; logo CDN e favicon quadrado exclusivo da fixture. Nenhum favicon global alterado.
- Fatos públicos: Andrea Machado Terra, fundadora, desde 2019, Rio de Janeiro/RJ, contatos e especialidades do briefing. Sem endereço, CNPJ, CPF, contrato, certificados, avaliações, equipe ou redes inventados.
- Catálogos herdados de Xcaret, Orlando, visto, resorts, cruzeiros, Portugal e editorial continuam navegáveis no prefixo técnico. Aviso persistente identifica conteúdo ilustrativo, sem oferta ou operação confirmada. Credenciais, equipe e avaliações desativadas para não inventar fatos.

## Isolamento verificado no código
- `App.tsx` monta essa rota antes de provedores de tenant/auth/cobrança, inclusive se houver query de contexto; apenas acrescenta o briefing à entrada isolada existente.
- `presentation: true` exige a allowlist exata já existente: id-preview deste projeto, localhost ou 127.0.0.1. Hosts públicos e sufixos enganosos recusados. Gates compartilhados não foram alterados.
- `strictBackendBlock: true` reaproveita integralmente a trava de `AdsBriefingPreview`: bloqueio de leitura/escrita/RPC/funções, incluindo antigas exceções públicas; submit e links externos interceptados; `window.open` neutralizado.
- `useAgencySiteRequest` recusa `.preview.local` independentemente da página. `noindex,nofollow` presente. Slug vazio e presentation impedem vincular consultas públicas a uma agência.
- Nenhuma consulta ou alteração no banco, conta, permissões, RLS, cobranças ou domínios; nenhuma publicação ou deploy. Vinculação real exige trabalho separado autorizado.

## Testes
- `bunx vitest run src/test/roteiros-da-terra-preview.test.tsx src/test/viaje-na-magia-preview.test.tsx`: 14 testes aprovados, incluindo regressão da fixture anterior.
- Testes verificam identidade sintética, cores concretas, favicon, ausência de dados privados/domínio ativo, catálogo completo, referências Ju/100 Limites preservadas, hosts recusados, hook de submissão, bloqueio de GET/POST/RPC/funções/forms/mailto/window.open.
- Playwright no localhost, desktop 1280×1800 e celular 390×844: home, FAQ expandida, abertura da janela de preferências, continuidade `/resorts-brasil`, mailto bloqueado, sem excesso horizontal; zero chamadas ao backend e zero erros JavaScript.
- Build automático: OK em 19/11/2026 18:21:41 UTC. Nenhum build manual executado.

## Limitações
- URL hospedada redirecionou para login do Lovable; acesso depende de sessão e autorização ao projeto. Não é um site público nem foi conectado a `roteirosdaterra.com.br`.
- Mídias CDN, inclusive o novo logo, não são entregues pelo localhost nesta sessão. Fonte enviada foi inspecionada e pointer criado corretamente, mas enquadramento final do logo/fotos na prévia hospedada permanece não verificado. Assets locais do mapa de resorts carregaram. Nenhuma substituição de mídia/gate compartilhado foi feita para contornar isso.
- Janela de preferências foi aberta, mas não houve envio comercial nem confirmação de recebimento; os testes exercitam os bloqueios diretamente. Todas as continuidades usam a engine existente; nem cada página de produto nem cada mídia foram inspecionadas individualmente.
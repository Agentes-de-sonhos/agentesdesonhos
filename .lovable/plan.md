# Walt Disney World Resort — landing em prévia (Destinos com a Ju)

Só inspeção e plano. Nada foi editado, enviado ou publicado. Não há alterações pendentes de outro trabalho no projeto (nenhum arquivo modificado), então não existe trabalho concorrente para reportar.

## O que já existe (Universal, usado como base)
- Rota `/universal` → `src/pages/whitelabel/UniversalLandingPage.tsx` (página própria, com cabeçalho próprio, carrossel de 530px, galeria de hotéis com abas e 6 por vez), registrada em `src/components/routing/AgencyDomainRoutes.tsx` só quando o perfil é `editorialRose`.
- Conteúdo em `src/components/landing/universal/content.ts`; logos/fotos como ponteiros em `src/assets/universal/*.asset.json`; foto da Ju (`ju-universal-globe`) é real.
- Ingressos: regras em `src/lib/universalTickets.ts` (limite de 14 dias, meses/datas, extras condicionais, `buildUniversalRequest`) + `UniversalTicketsConfigurator.tsx`, que envia por `useAgencySiteRequest` → função de solicitações já existente (agência resolvida pelo domínio no servidor; sucesso só com `success === true`).
- Hotéis: `universalHotelsCatalog.ts` + `universalHotelsGoogleData.json` (snapshot único do Google, fotos em `public/universal-hotels/<slug>/`), página `/universal/hoteis/:slug` usando o `AgencyResortPage` genérico (`resolve`/`backHref`/`kind`) e `HotelDetailsView` — o mesmo modelo dos resorts nacionais.
- Mapas Disney já prontos: `DISNEY_MAPS` em `src/components/orlando/DisneyParkMapDialog.tsx` (4 parques temáticos + Typhoon Lagoon + Blizzard Beach). Catálogo de Orlando (`orlandoCatalog.ts`) já tem os parques e eventos Disney (Halloween, Natal, After Hours).
- Menu: `src/lib/agencyReferenceProfiles.ts` (submenu Especialidades) e card "Explore os parques" em `OrlandoTicketsSection.tsx`.

## O que será construído
1. Página `/disney` (só Destinos com a Ju): carrossel com os 4 parques (logo, nome, título, subtítulo — sem botão, como na Universal), seção da Ju com foto real já existente da Ju (nenhuma imagem sintética no lugar dela).
2. Parques: 4 temáticos + 2 aquáticos, cada um abrindo o mapa que já existe.
3. Disney Springs: seção editorial (compras, restaurantes, entretenimento).
4. Eventos: cards com selo claro "Incluído no ingresso" ou "Ingresso separado".
5. Assistente de intenção de ingressos (não é compra): parques, número de dias, datas ou meses, extras (ex.: Lightning Lane, Park Hopper, Water Park & Sports) só quando fizerem sentido, viajantes, contato. Envia como pedido de orçamento pelo mesmo fluxo da Universal.
6. Hotéis: galeria com abas pelas categorias oficiais Disney (Deluxe Villa, Deluxe, Moderate, Value, mais outras que a pesquisa oficial confirmar), 6 por vez e "Ver mais".
7. Página própria por hotel `/disney/hoteis/:slug`: fotos, pedido de orçamento, "Por que ficar neste hotel", destaques, avaliações e mapa do Google — mesmo modelo dos resorts do Brasil e da Universal.
8. Menu: "Walt Disney World Resort" em Especialidades e botão "Saiba mais" no card Disney de Orlando, só para a Ju.

Textos, lista de hotéis, categorias, eventos e regras de extras esperam pela pesquisa oficial que você vai enviar; nada será inventado.

## Arquivos
Reaproveitar: `AgencyResortPage`, `HotelDetailsView`/`HotelGallery`, `useAgencySiteRequest`, `DisneyParkMapDialog`/`DISNEY_MAPS`, padrões de `UniversalLandingPage` (cabeçalho, carrossel, `HotelsGallery`, `WaButton`, `SectionIntro`).

Criar:
- `src/pages/whitelabel/DisneyLandingPage.tsx`
- `src/components/landing/disney/content.ts`, `disneyHotelsCatalog.ts`, `disneyHotelsGoogleData.json`, `DisneyTicketsConfigurator.tsx`
- `src/lib/disneyTickets.ts` (regras puras + `buildDisneyRequest`)
- `src/assets/disney/*.asset.json` (fotos/logos oficiais com crédito) e `public/disney-hotels/<slug>/` (snapshot otimizado)
- Testes em `src/test/` (abaixo)

Alterar (mínimo): `AgencyDomainRoutes.tsx` (2 rotas sob `editorialRose`), `agencyReferenceProfiles.ts` (item no menu da Ju), `OrlandoTicketsSection.tsx` (botão "Saiba mais" Disney só para a Ju).

Opcional, para evitar duplicação: extrair o carrossel e a galeria de hotéis da Universal para componentes compartilhados. Proponho NÃO fazer agora para não mexer na página Universal aprovada; fica como refatoração posterior.

## Rotas de prévia
- Prévia técnica: `http://localhost:8080/disney?__agency_host=destinoscomaju.com.br` e `/disney/hoteis/<slug>?__agency_host=...`
- No domínio da Ju continuam atrás do gate `/preview` enquanto o site estiver em construção. Nada publicado.

## Riscos de isolamento e cuidados
- Rotas e item de menu condicionados a `editorialRose`; outros tenants recebem 404 e não veem o menu (testado).
- Nenhuma mudança em banco, migração, regras de acesso, função de backend ou dados. O pedido usa a função existente; `service_key` "ingressos"/"hospedagem" já aceitos — se a pesquisa exigir um campo novo, ele vai em `details`, sem mudar o servidor.
- Importação Google: uma única chamada de leitura por hotel, salva no projeto; a página nunca consulta o Google em tempo real. Avaliações reais, com origem indicada.
- Direitos de imagem: só fotos oficiais/Google com crédito; foto real da Ju preservada.
- Nenhum envio real: testes e verificação no navegador com o envio interceptado (mock).

## Testes
- `disney-tickets.test.ts`: limite de dias, datas vs. meses, extras condicionais, payload do pedido (sem envio).
- `disney-hotels-catalog.test.tsx`: todo hotel da galeria tem página, ≥5 fotos existentes, nota, avaliações, mapa em Orlando, categoria oficial válida; slug desconhecido → sem página.
- `disney-events.test.ts`: todo evento tem marcação incluído/separado.
- Isolamento: menu e rotas só na Ju (atualizar teste do template da Ju; regressões 100 Limites, Essya, Casa Nova, SiteLab, Universal).
- Navegador (Playwright) em 360/768/1280: carrossel, mapas, abas de hotel, página do hotel, assistente até o envio mockado, imagens com `naturalWidth > 0`.

## Ordem
1. Receber a pesquisa oficial. 2. Snapshot Google dos hotéis. 3. Regras + assistente. 4. Página e hotéis. 5. Menu/botão. 6. Testes e verificação visual. Sem deploy.

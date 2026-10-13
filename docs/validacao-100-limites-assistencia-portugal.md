# 100 Limites — assistência em Portugal

## Identidade e origem do conteúdo
- Agência confirmada no cadastro: 100 Limites Viagens, Amanda Larini, `user_id` `9433421c-2252-4030-acab-135c03ab009e`, CNPJ 21.911.559/0001-43.
- Domínios: `100limites.tur.br` e `www.100limites.tur.br`.
- `/dmc-portugal` usa conteúdo estático da landing exclusiva do perfil editorialDmc. Não houve alteração de registros, schema, RLS, permissões ou entitlements.

## Arquivos da adaptação
- `src/pages/whitelabel/DmcPortugalLandingPage.tsx`: textos, serviços, destinos de acompanhamento, FAQs, CTAs, WhatsApp, SEO e fechamento; retirada da seção pública de frota e produtos de transporte.
- `src/components/whitelabel/DmcRequestCart.tsx`: formulário e resumo de assistência; rascunho versionado por hostname; rascunhos antigos permanecem armazenados, mas não são exibidos ou enviados.
- `src/lib/agencySiteProfile.ts`: rótulos de acompanhamento no submenu da 100 Limites.
- `src/components/routing/AgencyDomainRoutes.tsx`: link legado de frota direcionado para serviços.
- `src/test/agency-dmc-100-limites.test.ts`: regressão dos textos e retirada das ofertas inadequadas.
- `src/test/dmc-assistance-flow.test.tsx`: testes do formulário, revisão, payload, WhatsApp e isolamento dos rascunhos.
- `AGENTS.md` e `roadmap.md`: regras e registro da adaptação.
- Este documento: resultado das verificações.

## Verificações
- 32 testes passaram em seis arquivos: assistência, DMC, páginas institucionais, domínios e rodapé. Após corrigir a tipagem do novo teste, os dois arquivos de assistência/DMC foram novamente executados: 13 testes passaram.
- Último resultado do build automático consultado: `build OK` após a correção de tipagem do teste.
- Rota local real mantém o gate de senha. Sem senha, a página publicada não foi inspecionada visualmente após as mudanças.
- Inspeção isolada do módulo real da landing, em navegador local com os dados públicos cadastrados da agência: título correto, nenhuma seção `#frota`, popup abre, item é adicionado e a revisão apresenta data, adultos e locais de interesse; largura móvel de 390px sem overflow horizontal.
- Envio e WhatsApp final foram verificados em testes com o hook de envio simulado. Nenhum lead real ou e-mail de teste foi enviado; entrega efetiva ao CRM/e-mail não foi validada ponta a ponta.
- Foto original da Amanda preservada no mesmo ponteiro de asset usado pela home. O servidor local retorna HTML, em vez de imagem, para esse endereço `/__l5e/assets-v1/...`; por isso a foto aparece indisponível na inspeção local. A disponibilidade do asset deve ser conferida na prévia hospedada antes da publicação. Nenhuma foto foi substituída.

## Publicação
Nada foi publicado. As mudanças de código exigem publicação autorizada para aparecerem em `https://100limites.tur.br/dmc-portugal`; não existe atualização de CMS/banco pendente.
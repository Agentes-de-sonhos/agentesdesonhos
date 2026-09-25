# Plano: fotos reais da Juliana, selo Xperts e fachada da Destinos

## Objetivo
Aplicar somente os arquivos enviados agora nas páginas da Destinos com a Ju, sem publicar, sem mudar senha/status dos sites, sem banco e sem afetar outros tenants.

## O que será feito
1. Preparar assets otimizados
   - Converter as fotos enviadas para WebP e armazenar como assets do projeto.
   - Extrair o selo do PDF Xperts Xcaret 2026 e usar como imagem do selo.

2. Landing `/xcaret`
   - Preencher os slots opcionais já existentes:
     - retrato/visita da Juliana no Xcaret;
     - foto de treinamento/certificado;
     - selo Xperts Xcaret;
     - foto final da Juliana no destino.
   - Manter a regra atual: se algum slot estiver ausente, ele não cria placeholder nem espaço vazio.

3. Página principal da Destinos com a Ju
   - Usar as fotos da fachada da loja na seção “Sobre” da Destinos com a Ju.
   - Usar uma foto real da Juliana no Xcaret na seção de destaque Xcaret da home.
   - Adicionar o selo Xperts Xcaret dentro da seção de destaque Xcaret.
   - Preservar tema, conteúdo, formulário, links e demais seções já aprovadas.

4. Isolamento
   - Aplicar tudo apenas ao perfil `editorialRose` dos hosts `destinoscomaju.com.br` e `www.destinoscomaju.com.br`.
   - Não alterar 100 Limites, Paraíso, Essyatur, SiteLab, login, Área do Cliente, banco ou permissões.

5. Validação focada
   - Conferir testes focados da landing Xcaret e da seção de destaque.
   - Conferir typecheck/build conforme permitido pelo fluxo atual.
   - Relatar honestamente qualquer limite de inspeção visual por causa do gate de senha.

## Arquivos previstos
- `src/components/landing/xcaret/content.ts`
- `src/lib/agencySiteProfile.ts`
- `src/pages/whitelabel/AgencySiteHome.tsx`, somente se necessário para suportar imagem direta na seção “Sobre”
- `src/test/xcaret-landing-render.test.tsx`
- `src/test/agency-featured-experience.test.tsx`
- `src/test/agency-destinos-com-a-ju-template.test.ts`
- Novos ponteiros `.asset.json` em `src/assets/whitelabel/xcaret/` e `src/assets/whitelabel/destinos-com-a-ju/`

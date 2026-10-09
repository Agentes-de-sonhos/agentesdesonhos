# O Mundo em Cores — ajustes aprovados

## Resultado
- Base branca e alternância declarativa com degradê azul muito claro, escopado a `wl-mundo`.
- Hero e textos aprovados; 29 anos atribuídos à experiência profissional da Vanessa, sem data de fundação.
- Especialidades com fotografia acima e texto em área branca; quarto cartão Elas Viajam.
- Sobre com primeira pessoa, destinos conhecidos e fotografias pessoais reais recuperadas do site oficial.
- Três depoimentos exatos fornecidos, sem estrelas ou referência a Google.
- Rodapé claro, sem pendência de domínio no texto comercial; Instagram preservado.
- Noindex explícito passado pelo caller técnico para evitar metadados contraditórios da home compartilhada.

## Arquivos alterados
- `src/lib/adsBriefingPreview.ts`
- `src/lib/agencySiteProfile.ts` (somente novos campos opcionais; nenhum perfil existente modificado)
- `src/components/whitelabel/AgencyCampaignRail.tsx`
- `src/pages/whitelabel/AgencySiteHome.tsx`
- `src/pages/adsPreview/AdsBriefingPreview.tsx`
- `src/index.css` (somente acabamento `wl-mundo`)
- `src/assets/ads-preview/mundo-em-cores-vanessa-oficial.png.asset.json`
- `src/test/mundo-em-cores-preview.test.ts`
- `AGENTS.md`, `roadmap.md`, memória específica e respectivo índice
- Este relatório

## Validação
- 47 testes passaram em 6 arquivos: novo contrato de conteúdo, ADS preview, ADS contract, hostname, navegação SiteLab e status dos sites.
- Verificação automática da prévia: `build OK`, sem compilação manual adicional.
- Playwright: 1280 × 1800 e 390 × 1800; sem overflow horizontal nem erros de execução.
- Hero e cartões: cliques bloqueados, aviso mostrado, nenhum diálogo comercial aberto.
- Carrossel de especialidades: seta avança normalmente no desktop.
- Nenhuma chamada ao backend observada durante os fluxos testados.
- Metadados robots: todos noindex/nofollow, sem index/follow contraditório.
- Comparação SHA-256: configurações completas Drica/Viajar e bloco de todos os perfis existentes (incluindo Destinos com a Ju/100 Limites) permaneceram idênticos.
- Nenhum banco, conta, domínio, permissão, entitlement ou publicação alterado.

## Foto e limitação de ambiente
Fotografia pessoal recuperada de https://omundoemcores.com.br/wp-content/uploads/2024/07/Vanessa.png, já composta pelo site oficial. Armazenada via ponteiro CDN; sem imagem fictícia, corte ou galeria de banco. Não há pendência de obter foto real.

O servidor localhost não resolve a rota de mídia `/__l5e/assets-v1/`, retornando HTML em vez de imagem. Para verificar a aparência, o teste de navegador serviu temporariamente os bytes originais baixados do CDN para os mesmos endereços. Isso não modifica a aplicação; o carregamento nativo dessas mídias no painel hospedado não foi validado por esse teste. Os demais elementos foram testados no app local real.

## Prévia e commit
URL exata: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-14-v1

Referência HEAD consultada durante a validação: `bfc597b6d`. Não foi criado commit manual; o histórico é gerenciado pela plataforma. Nada publicado.
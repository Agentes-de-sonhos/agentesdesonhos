---
name: Galeria editorial Orlando — Destinos com a Ju
description: Nove fotografias oficiais na página de ingressos, antes do formulário intacto
type: feature
---
- Alterar exclusivamente a página pública /ingressos-orlando da Destinos com a Ju; nunca a home, cabeçalho, rodapé ou outros tenants.
- Título: "Parques e experiências em Orlando". Apoio: "Descubra algumas das experiências que podem fazer parte da sua viagem."
- Exatamente nove fotos na ordem Disney, Universal, United Parks, LEGOLAND, Kennedy Space Center, ICON Park, Cirque du Soleil — Drawn to Life, Blue Man Group Orlando, Orlando Magic.
- Somente fotografias de fontes oficiais das empresas, armazenadas no projeto/CDN, sem hotlink, sem substituir por logotipos ou imagens geradas.
- Grade 3 colunas desktop, 2 tablet, 1 mobile; fotos 16:9 cover, nomes sobre gradiente inferior, sem botões ou descrições nos cards.
- Preservar integralmente quatro etapas, validações, seleção, resumo e envio; não publicar.
- Implementada em OrlandoEditorialGallery.tsx e composta somente em AgencyDomainRoutes.tsx; OrlandoTicketsSection.tsx não foi alterado.
- 22 testes passaram. Playwright em fixture isolada: 9 imagens decodificadas, grade 3/2/1, sem overflow, quatro etapas e envio interceptado sem dados reais. A rota real permanece bloqueada pela senha de revisão; CDN local requer interceptação dos arquivos, pois localhost não serve /__l5e.
- Fotos públicas Disney 600×400, SeaWorld 750×422, Magic 691×421 abaixo da resolução solicitada: pendente substituir por originais licenciados de alta resolução. Permissões comerciais precisam ser confirmadas antes de publicar. Orlando Magic extraída do guia oficial 2024/25 p.446 (índice PDF 224), sem jogadores/público. Não usar a foto descartada de kiacenter.com.

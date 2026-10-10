# Universal — validação dos quatro mapas

Implementação exclusivamente frontend. Nenhuma publicação, alteração de banco, ativação de entitlement ou mudança no orçamento. Os dez mapas anteriores e o motor compartilhado não foram editados. LEGOLAND, Kennedy e ICON não receberam mapas nesta etapa.

Prévia: https://id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app/ads-briefing-preview/briefing-14-v1/ingressos-orlando

## Conteúdo completo

| Parque | Atrações | Restaurantes | Compras | Itens únicos | Âncoras |
|---|---:|---:|---:|---:|---:|
| Universal Studios Florida | 41 | 26 | 0 | 67 | 67 |
| Islands of Adventure | 29 | 22 | 0 | 51 | 51 |
| Epic Universe | 23 | 28 | 0 | 51 | 52 |
| Volcano Bay | 20 | 7 | 0 | 27 | 28 |
| Total | 113 | 83 | 0 | 196 | 198 |

Referências consecutivas completas: Studios 1–41/A–Z; Islands 1–29/A–V; Epic 1–23/A–Z/AA/BB; Volcano 1–20/A–G. Nomes próprios conservados, incluindo Bourne 41, If I Ran The Zoo 29, Meet Toothless 23 e Waturi Beach 20. Gringotts Money Exchange e Cosme Acajor permanecem na categoria Atrações da legenda, não foram reclassificados por suposição.

Epic conserva os dois círculos N de Starbucks. Volcano conserva os dois círculos 15 de Kopiko Wai e os centros distintos de 16/17. Uma entrada por item na lista; todas suas âncoras são destacadas. IDs internos separados por categoria e referência; sem sobreposição duplicada no mesmo centro. Serviços, preços `$`, símbolos Express e QR não viraram pontos.

## Fontes, recortes e cores

Quatro PDFs de uma página, 1224×792 pontos: `universal-studios-florida-park-map_PT.pdf`, `islands-of-adventure-park-map-english.pdf`, `universal-epic-universe-park-map-english.pdf`, `uvb-park-map.pdf`.

Recorte conferido visualmente em cada fonte: `[27,27,722,675]` pontos, apenas mapa, preservando logo, áreas brancas do desenho, entrada/saída e transporte. Exclui legenda direita e rodapé de serviços/QR. Renderização vetorial MuPDF, gerenciamento ICC para sRGB, escala 5 = **360 dpi**, PNG sem perda **3475×3240 px** para cada parque. Não é imagem recriada ou upscaling de screenshot. Centros dos círculos extraídos dos paths brancos originais de 10 pontos, associados aos spans vetoriais de referência; coordenadas percentuais calculadas a partir do crop. Diâmetro interativo 55 pixels nativos cobre o círculo original de 50 pixels incluindo borda.

Tamanhos dos assets: Studios 18.425.550 bytes; Islands 13.131.056; Epic 2.330.051; Volcano 15.520.256. HTTP 200 `image/png` no domínio da prévia: bytes recebidos idênticos aos quatro PNGs originais. Pointers em `src/assets/orlando/maps/`; documentos e URLs das imagens same-origin, carregados apenas ao abrir o respectivo popup.

## Detalhes e limites da fonte

Descrições em português identificam a experiência ou ponto de alimentação exclusivamente com base na legenda. Traduções de encontros/shows não acrescentam mecânicas presumidas. Alturas métricas impressas transcritas; Pteranodon conserva faixa de 92–143 cm. Hogwarts Express nas referências corretas Studios 12/Islands 22 mantém exigência Park-to-Park ou passe elegível e aviso de restrições adicionais.

Volcano conserva pesos impressos, incluindo Taniwha 136 kg individual/204 kg dupla e limites de boias; avisos de acompanhante entre 107–122 cm e colete abaixo de 122 cm aplicados somente aos símbolos correspondentes na legenda. Não há horários, preços, datas de inauguração ou alegação de status atual. Símbolos de acessibilidade/transferência não foram transformados em promessas de elegibilidade individual. Não há lista geográfica própria de compras nos quatro guias: **Compras (0)** permite filtro e apresenta estado vazio real, sem lojas inventadas. Nenhuma referência ficou sem nome após conferência ampliada da legenda (incluindo Islands 10–16/M).

## Evidências de responsividade e interação

Playwright: 1920×1080, 1366×768, 1024×600 e 390×844, cada um dos quatro parques, 100%/200%. Imagem inteira pela largura, altura natural, raio 18 px, sem contain baseado em altura; coluna desktop 340 px. Na página estática, medidas iguais para os quatro PNGs:

| Tela | Imagem a 100% (px) | Diâmetro 100%/200% (px) | Imagem inteira |
|---|---|---|---|
| 1920 | 1508×1406,02 | 23,87 / 47,74 | bottom 1431,02 ≤ frame bottom 1432,02 |
| 1366 | 954×889,48 | 15,10 / 30,20 | confirmada |
| 1024 | 612×570,61 | 9,69 / 19,37 | confirmada |
| 390 | 364×339,38 | 5,76 / 11,52 | confirmada |

Razão diâmetro/largura constante **55/3475 = 1,58273%**. Zoom aplicado uma única vez, fonte/borda/realce acompanhando a mesma escala. Medidas também verificadas dentro dos 16 popups/telas reais, sem cortar o fundo da imagem a 100%. Desktop alto exige scroll vertical, mobile imagem e painéis compartilham a mesma rolagem.

- Wheel sobre mapa altera imediatamente percentual sem mudar scroll da página, inclusive nos limites 100%/500%; fora do mapa rola documento. Drag real e pinça por eventos reais CDP verificados nas 16 combinações, reset retorna imagem inteira a 100%. Hover abre tooltip; resize de 1920 para 1366 a 200% preserva razão dos marcadores e reset revela imagem inteira.
- Todas **196 entradas da lista** clicadas: detalhe com nome correto, tooltip visível e quantidade correta de âncoras amarelas. Busca, filtros combináveis, Compras vazio e desseleção em área livre conferidos.
- **14 logos** abrem seus próprios documentos, incluindo regressão dos dez existentes. Iframe é lazy mount. Fechamento X alinhado à borda direita do modal (gap <2 px), posição fixa durante scroll; Escape dentro do iframe fecha, desbloqueia scroll e devolve foco ao logo nas 16 combinações Universal/tela.
- Sem erros JavaScript nas páginas dos quatro mapas durante as verificações. Screenshots e medições temporárias: `/tmp/browser/universal/` (`measurements.json`, `dialogs.json`, screenshots por parque/tela e modal).

No localhost o encaminhamento do CDN responde HTML em vez de PNG. Para os testes locais de layout, somente as requisições das quatro imagens foram respondidas pelos PNGs originais; HTML/CSS/JS e app não foram interceptados. A entrega real dos assets foi verificada separadamente no domínio da prévia por igualdade de bytes.

## Testes automatizados

**52 testes aprovados, cinco arquivos**: `universal-park-maps`, `disney-park-maps`, `united-park-maps`, `magic-kingdom-map`, `orlando-tickets-gallery`.

Cobertura: referências/categorias completas, dimensões/crop/proveniência, centro original versus coordenadas, todos itens/âncoras, repetições reais, alturas/avisos selecionados, HTML/JSON iguais, motor comum, ausência de footer/header privado, lazy mount, mensagem de fechamento de origem inválida rejeitada, popup correto e seleção de orçamento independente. Build automático do ambiente aprovado; nenhuma publicação executada.
# Piloto Pousada Maravilha — diagnóstico (sem implementação)

## O que existe hoje (verificado no código)
- `google-place-reviews`: aceita só `hostname`; Place ID vem de allowlist fixa por domínio de agência. Não aceita hotel. Retorna até 5 avaliações + `googleMapsUri` + atribuição de autor, sem persistir. Usa segredo `GOOGLE_PLACES_API_KEY` (chave própria, chamada direta ao Google, não conector).
- `club-med-snow-places`: aceita só slugs da allowlist Club Med e grava o payload (com avaliações) em `club_med_place_cache` — viola "não persistir avaliações".
- `hotel-place-match`: busca por texto/Place ID (API clássica), sem avaliações nem checagem de login.
- `resortsGoogleData.json` já guarda texto de avaliações no bundle — não serve de modelo.
- Nenhuma função aceita a Pousada Maravilha hoje.

## Reuso em projeto privado separado
- Não é possível reutilizar sem copiar: o segredo está preso a este Cloud, que serve preview E produção (mesma instância). Chamar daqui a partir de outro projeto = tocar produção.
- Caminho limpo: no projeto da prévia editorial, conectar o conector Google Maps (gerenciado) — chave fica só no servidor daquele projeto, nada de produção é ligado.

## Procedimento recomendado (no outro projeto)
1. Aprovação humana: Fernando conecta Google Maps nesse projeto e aceita o custo.
2. Uma função de servidor com Place ID fixo (sem parâmetro livre), exige login, máscara `id,displayName,formattedAddress,nationalPhoneNumber,googleMapsUri,rating,userRatingCount,reviews`, `Cache-Control: no-store`, sem fotos, sem gravação.
3. Validação de ficha: 1 `searchText` "Pousada Maravilha Fernando de Noronha"; confirmar endereço BR-363 e telefone +55 81 99836-0001; Fernando aprova o Place ID.
4. Exibição sob demanda (clique), até 5 avaliações com autor + link + "Avaliações do Google Maps".

## Contagem máxima de chamadas
- 1 busca + 1 detalhe de validação + até 3 detalhes de teste de exibição = **5 chamadas**. Lote de 152 fora.

## Aprovações humanas necessárias
- Conectar Google Maps no projeto da prévia (ou criar segredo próprio).
- Confirmar o Place ID encontrado.
- Autorizar as ≤5 chamadas faturáveis.

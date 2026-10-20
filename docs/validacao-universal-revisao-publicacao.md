# Revisão Universal — 20/10/2026, sem publicação

## Alterações
- Três arquivos enviados por Fernando persistidos como pointers CDN em `src/assets/universal`: `Universal-Express.webp.asset.json`, `VIP-Experience.webp.asset.json`, `Halloween-Horror-Nights.webp.asset.json`.
- `UniversalTicketsConfigurator.tsx`: `EXTRA_LOGOS` usa exclusivamente esses logos; área estável de 112 px, `object-contain`, fundo claro para Express/VIP e escuro para HHN. Foto existente e verificada de Juliana no Magic Kingdom preservada, com recorte horizontal corrigido para mostrar Juliana, sem afirmar que está na Universal. Nenhuma outra fonte da landing alterada.
- `useAgencySiteRequest.ts`: sucesso exige `result.success === true`; resposta nula, `{}`, `success:false` e duplicação sem confirmação são erros. Rejeições de invoke são capturadas e retornam `{ error:true }`, sem propagação. Mantidos hostname, payload, retorno dos consumidores, erros HTTP e duplicados válidos.

## Evidências de imagens
Todas as oito fontes foram abertas individualmente no Chromium, diretamente em seus endereços no host técnico da prévia, sem interceptação: HTTP 200 e `naturalWidth > 0`.

| Imagem | Dimensões naturais |
|---|---|
| Universal Express | 360 × 180 |
| VIP Experience | 185 × 260 |
| Halloween Horror Nights | 360 × 192 |
| Universal Studios Florida | 500 × 281 |
| Universal Islands of Adventure | 500 × 372 |
| Universal Epic Universe | 500 × 411 |
| Universal Volcano Bay | 500 × 374 |
| Juliana | 1916 × 821 |

No configurador montado a partir do código Vite atual, todas as 16 instâncias de imagem (seleção, dias, resumo e extras) carregaram com largura natural positiva em 360/768/1280. Capturas conferidas: foto mostra Juliana, VIP legível no fundo claro, HHN legível no fundo escuro e proporções preservadas.

## Interação de navegador e testes
- 360/768/1280 px: quatro parques, total 14 com 11+1+1+1; todos os botões + desabilitados; redução libera capacidade de todos; 5+1+1+1 (8) continua normalmente.
- Alternar um dia para cada parque esconde controles; retornar ao modo repetir preserva distribuição; ausência de contador/meta “x de 14”.
- Datas invertidas, passadas e estadia menor que dias de parque bloqueadas; ajuste libera.
- Hogwarts Express apenas com ambos os parques clássicos; remover um esconde pergunta e limpa acesso do envio.
- HHN aparece em setembro/outubro, desaparece em novembro e não reaparece selecionado. Meses múltiplos setembro/outubro de 2027 enviados como YYYY-MM, sem datas misturadas.
- Envio interceptado no navegador: `{}` mostra erro e preserva nome; retry com `success:true, duplicate:true` mostra confirmação. Duas chamadas simuladas; nenhuma chamada ao servidor de captação, lead ou notificação real.
- Nenhum erro JavaScript, nenhum overflow horizontal nas três larguras.
- 42 testes aprovados em seis arquivos, incluindo oito testes focados do hook, nove Universal e regressões da central/jornada/Xcaret. Compilação automática `build OK` em 01:06:34 UTC; compilação/typecheck não executados manualmente.

## Limitação da verificação
O proxy de assets do localhost não entrega esses binários diretamente. O teste de interação encaminhou as requisições de imagem para os mesmos endpoints reais da prévia (não substituiu por placeholders), e a checagem independente abriu cada endpoint no Chromium sem interceptação. A abertura de todas as imagens via JavaScript a partir do documento hospedado falhou nesse ambiente; portanto não foi validada a página completa hospedada dentro da sessão do editor. Não há evidência de asset defeituoso: todas as fontes reais decodificam diretamente e no configurador testado. Conferência final da página hospedada no editor continua a cargo de Fernando antes do deploy.

Sem publicação, deploy de função, migração, alteração de permissões ou dados reais.

## Troca da foto de perfil (20/10/2026)
- Foto enviada por Fernando persistida como pointer `src/assets/universal/ju-universal-globe.png.asset.json` (720 × 1280, PNG, 1.446.265 bytes): Juliana com o globo da Universal ao fundo.
- `UniversalTicketsConfigurator.tsx` passou a importar esse pointer no lugar de `hero-ju-magic-kingdom.png.asset.json`. A home da Destinos com a Ju (`AgencySiteHome.tsx`) mantém a foto anterior.
- Recorte do avatar: contêiner circular com `overflow-hidden` e `img` em `scale-[2.2]`, `transform-origin: 60% 35%` — equivale a um quadrado de 327 px centrado no rosto (400; 582). Comparados recortes de 200/327/450 px: o de 327 px foi o único sem corte de cabeça e com rosto reconhecível em miniatura.
- Evidências: `naturalWidth > 0` do novo ponteiro em 1280 e 390; capturas do avatar e do cartão de apresentação conferidas; 17 testes (Universal + hook) e `build OK`.
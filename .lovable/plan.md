# Logotipos nas páginas iniciais dos domínios públicos

Trocar a nuvem + nome pelo logotipo enviado de cada domínio, apenas na página inicial (sem caminho) de:
vitrine.tur.br, seuroteiro.tur.br, seuorcamento.tur.br, proximaviagem.tur.br, contato.tur.br, carteiradigital.tur.br (com e sem www).

## O que muda
- Fundo branco, logotipo centralizado (já inclui o nome e o endereço), tamanho confortável no computador e no celular.
- Título da aba continua igual.
- Nenhum link completo (orçamentos, roteiros, carteiras, contatos, vitrines de agência) é alterado — a regra que decide quando mostrar essa página não muda.

## Detalhes técnicos
- Enviar os 6 PNGs via `lovable-assets` para `src/assets/public-domains/*.png.asset.json`.
- `PublicDomainRoot.tsx`: mapa host → { label, logo }; `publicDomainRootLabel` preservado; render `<img src={logo.url} alt={label}>` no lugar do SVG, com `h1` visualmente oculto (sr-only) para acessibilidade.
- Ajustar `src/test/public-domain-root.test.tsx` para verificar a imagem por domínio e que rotas com caminho não são interceptadas.
- Atualizar memória vitrine-shared-host. Sem publicação.

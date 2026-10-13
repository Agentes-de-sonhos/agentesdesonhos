# 100 Limites — prévia jurídica (Política, Termos e rodapé legal)

Status: rascunho para revisão. Não ativo em produção.

- Fonte única: `src/lib/agencyLegal/limites100LegalPreview.ts`.
- Ativação: `isLimites100LegalPreviewActive(tenant, browserHost)` exige igualdade exata do host do navegador com a allowlist própria (`id-preview--dd6dbb29-4840-49e0-a65f-51c17806d3f9.lovable.app`, `localhost`, `127.0.0.1`) **e** tenant `100limites.tur.br`/`www.100limites.tur.br`. Não usa o helper global `isTechnicalPreviewHost`; nenhum outro `*.lovable.app` (inclusive o publicado) ativa. Sem query parameter, flag ou storage.
- Fora disso, `/politicasdeprivacidade` e `/termosdeuso` continuam com os textos da plataforma e o rodapé fica inalterado.
- Para ativar em produção após aprovação jurídica: alterar o guard deliberadamente e resolver as pendências listadas em `LIMITES100_LEGAL_PENDING`.

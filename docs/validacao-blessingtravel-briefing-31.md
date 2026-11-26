# Validação — Blessingtravel (briefing-31-v1)

- URL da prévia: `/ads-briefing-preview/briefing-31-v1` (preview técnico; hostname sintético `briefing-31-v1.preview.local`)
- Sem deploy, publicação, domínio, RLS, migrations, Edge Functions, cobrança ou alteração de acesso.

## Isolamento
- UUID sintético `00000000-0000-0000-0000-00000000ad31`; `agency_slug` vazio, `public_slug` nulo, `is_primary` false.
- **Pendente:** vincular futuramente ao cadastro real (confirmado fora deste pedido) e a um domínio público ativo inequívoco. Nada foi alterado no cadastro.
- `presentation:true`, `demo:false`, `strictBackendBlock:true`, noindex/nofollow via fixture compartilhada.
- `www.blessingtravel.com.br` NÃO resolve esta fixture.

## Marca
- Sem logo/favicon (`logo_url` nulo, sem registro em agencySiteBrand); wordmark textual "Blessingtravel".
- Paleta: tokens neutros compartilhados do SiteLab Base (#0F1729 / #F6F6F8), tema `siteBaseEditorial`.

## Conteúdo
- Apenas dados autorizados (São Paulo/SP, 2011, 23 anos, especialidades, públicos, destinos, diferenciais, caso de Roma, Samantha Casellato Perrucci, canais públicos em texto).
- Sem CPF, endereço, CNPJ, datas contratuais, certificações, avaliações reais ou preços.
- Portugal/DMC, visto, Xcaret, resorts, cruzeiros, Orlando, blog e ofertas: continuidade editorial ilustrativa, bloqueada.

## Evidências
- `src/test/blessing-preview.test.tsx`: 15 testes (job_id exato, host sintético, não vinculação, wordmark, paleta neutra, isolamento de fixtures 27–30, inventário completo, backend/formulários/ações externas bloqueados) — aprovados, junto com testes JE VIAGENS e RB TOUR (39/39).
- Typecheck: nenhum erro novo (3 erros pré-existentes em outras fixtures).
- Captura: `docs/validacao-blessingtravel-briefing-31.png`.

## Limitações
- No navegador local da sandbox, as imagens do acervo (CDN) não carregaram na captura; no preview da plataforma devem aparecer.
- Contatos públicos aparecem só em texto; botões de WhatsApp ocultos.

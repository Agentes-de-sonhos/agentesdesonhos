# Módulo Site → Blog (white-label) — v1

## Achados da inspeção
- Habilitação por agência já existe: `agency_entitlements` + `agency_has_entitlement(agency_id, key)` / `current_agency_entitlements`. O blog usará a chave `site_blog` (default: inexistente = desligado). Nenhum plano/cobrança novo.
- Editor confiável já existe com Tiptap core (`PlaybookRichTextEditor`, `ResizableImageExtension`). Será reaproveitado numa versão restrita (sem HTML livre, sem iframe genérico; YouTube só por URL validada).
- Rotas públicas white-label ficam em `src/components/routing/AgencyDomainRoutes.tsx`; o `/blog` atual de `App.tsx` é o blog do próprio app e não será tocado.
- Leads: `submit-lead-form` (Edge Function) já grava no CRM da agência; será reaproveitado com origem `blog` + slug/URL.
- Agendamento: há crons existentes (`google-calendar-cron`, `product-landing-lead-emails`); será criado um job dedicado e idempotente.
- Projeto é SPA (sem SSR). SEO por artigo para robôs sociais exige proxy servidor: reaproveitar o padrão `public-og` (Edge Function) para servir metatags/OG e um sitemap por domínio. Limitação documentada abaixo.

## Etapas (entregues em sequência, todas em prévia, nada publicado)

**Etapa 1 — Banco e segurança (requer sua aprovação)**
Migração aditiva:
- `site_blog_settings` (agency_id PK, convite padrão do CTA, fuso default `America/Sao_Paulo`, autor default).
- `site_blog_categories` (agency_id, nome, slug único por agência).
- `site_blog_posts` (agency_id, slug único por agência, status `draft|scheduled|published|unpublished`, campos de trabalho `draft_*` separados dos campos publicados `pub_*`, `scheduled_at`, `published_at`, `updated_published_at`, capa/alt, resumo, categoria, autor, destaque, SEO, CTA próprio).
- `site_blog_post_revisions` (snapshot jsonb do rascunho; restaurar só reescreve o rascunho).
- `site_blog_publish_log` (execuções/falhas do agendador).
- Bucket privado `site-blog-media` com caminho `{agency_id}/{post_id}/...`; políticas de storage checam membro da agência + recurso ativo; leitura pública via função que só entrega mídia de post publicado.
- RLS: escrita só para dono/membro da agência com permissão e `agency_has_entitlement(agency, 'site_blog')`; leitura anônima apenas via RPC `public_blog_list/public_blog_post(hostname, ...)` que resolve o tenant por `get_agency_domain` e devolve só campos `pub_*` de agência habilitada. Trigger valida que categoria pertence à mesma agência.
- Funções `blog_publish_now`, `blog_schedule`, `blog_cancel_schedule`, `blog_unpublish`, `blog_run_scheduled()` (idempotente, `FOR UPDATE SKIP LOCKED`, respeita recurso desligado, registra falha) + pg_cron a cada 5 min.

**Etapa 2 — Painel do agente**
- Menu "Site" expansível com "Blog", visível só com recurso + permissão. Rotas `/site/blog`, `/site/blog/novo`, `/site/blog/:id`.
- Lista: busca, abas Publicados/Rascunhos/Agendados, ações editar/duplicar/visualizar/retirar do ar; categorias e configurações em menu secundário; estado vazio.
- Editor contínuo com autosave (salvando/salvo/erro, aviso ao sair), rascunho criado antes do primeiro upload, imagens comprimidas no navegador, galeria, YouTube, histórico de versões, prévia desktop/mobile protegida, publicar/agendar (fuso explícito)/cancelar/retirar.
- Admin: alternância "Blog do site" por agência na tela de entitlements existente.

**Etapa 3 — Público e conversão**
- `/blog` (destaque, cards, busca, categoria, paginação por `?pagina=`) e `/blog/:slug` (capa, autor, datas, mídia, WhatsApp/copiar link, relacionados) em `AgencyDomainRoutes`, com cabeçalho/rodapé da agência; link "Blog" no menu só se habilitado e com ≥1 publicado.
- CTA final: formulário via `submit-lead-form` com origem Blog + artigo/URL; sucesso só após gravação; WhatsApp contextual registrado como clique (não lead).

**Etapa 4 — SEO e validação**
- Metatags client-side + JSON-LD BlogPosting; extensão do `public-og` para `/blog/:slug` e sitemap por domínio só com publicados. Rascunhos/prévias com `noindex` e nunca servidos pela API pública.
- Testes: isolamento entre duas agências, anônimo vs rascunho/revisão/mídia alheia, recurso desligado, agendamento/fuso, autosave sem vazar ao publicado, slug, YouTube, gravação de lead (com dados de teste removidos depois).

## Limitações conhecidas
- Sem SSR: Google indexa via JS; previews sociais por artigo dependem do proxy `public-og` estar na frente do domínio (já é o padrão do app). SEO "completo" de conteúdo renderizado exigiria migração para TanStack Start.
- Fora do escopo: IA, newsletter, comentários, tradução, colaboração simultânea, upload de vídeo.

## Piloto
Após as etapas, habilitar uma agência pela administração (ou inserindo `site_blog` em `agency_entitlements` com sua autorização). Nenhuma agência será habilitada automaticamente e nenhum artigo será publicado.

# SEO — O Mundo em Cores (07/11/2026)

## Escopo
Home e quatro páginas: `/oportunidades-novembro`, `/disney`, `/universal`, `/resorts-brasil`. Metadados por caminho em `mundoSeo.ts`; dados WebSite/TravelAgency na home; canonical uniforme com www, coerente com o hostname público de contato já configurado. Sitemap dedicado. Disney adicionada ao menu; as três especialidades recebem links diretos no rodapé. Demais tenants mantêm as regras anteriores.

## Diagnóstico de código
Disney aplicava useNoindex incondicionalmente. A regra central de rotas também excluía Disney/Universal/resorts; Universal usava o canonical padrão de agentesdesonhos.com.br. O hook de título da agência podia substituir títulos de página. As correções são restritas aos hosts exatos do Mundo e aos cinco caminhos públicos. Previews técnicos continuam noindex; documentos por código e áreas privadas não são liberados.

## Campanha e leads
Nenhuma renomeação, redirect, alteração de URL, formulário, payload ou função de envio. `/oportunidades-novembro`, filtros de canais, UTM e fluxo de solicitações permanecem. Testes existentes verificam ofertas reais, isolamento e solicitações; não foram criados leads reais em produção.

## Validação
45 testes aprovados em quatro arquivos: mundo-seo, november-campaign-release, agency-slug-routing, agency-site-requests. Build Vite aprovado; avisos preexistentes de CSS, assets e chunks grandes. npm ci bloqueado por lockfile já desatualizado; dependências instaladas sem alterar manifest/lockfile. Build gera MCP automaticamente; essa alteração gerada fica fora do PR.

Revisão visual do site real não concluída: domínio devolveu Site Unavailable neste navegador; preview gerenciado usa terminal.local, fora da allowlist de contexto de tenant. Nenhuma alteração de gates ou permissões para contornar isso. A prévia editorial está em seo-mundo-em-cores-preview.html; não simula ranking nem garante sitelinks.

## Publicação e acompanhamento
Aguardar revisão de Fernando, conforme fluxo combinado. Antes da publicação, validar as cinco rotas e canonical www na hospedagem oficial; revisar menu desktop/celular no contexto autorizado do Lovable. Após publicar: inspecionar URLs no Search Console, conferir HTML renderizado sem noindex/duplicidade de canonical, enviar sitemap-omundoemcores.xml e solicitar indexação das cinco URLs. Acesso ao Search Console ainda não estabelecido nesta sessão. Não há acompanhamento automático configurado.

Referências: https://developers.google.com/search/docs/appearance/sitelinks e https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics.

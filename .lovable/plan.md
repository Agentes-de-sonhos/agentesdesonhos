# Módulo "Ofertas" em Meus Projetos (somente plano, nada implementado)

## 1. O que já existe hoje (conferido)
- **Orçamentos:** tabelas `quotes` e `quote_services`, editor `GerarOrcamento`, página pública `/orcamento/:code` (renderer `OrcamentoPublicoV2`), links montados por `publicAgencyUrls.ts` (slug canônico + código público).
- **Meus Projetos:** abas Orçamentos | Carteiras | Roteiros | Modelos com `?tab=`; no white label a navegação passa por `useAdminNav()` (`/gestao/*`).
- **Vitrine atual:** `agency_showcases`, `showcase_items` (imagem, categoria, `expires_at`, `is_active`), `showcase_stats` (eventos), `vitrine_categories`, `showcase_auto_overrides`; páginas `MinhaVitrine` e `VitrinePublica`. O menu dos sites já tem "Ofertas" → `/ofertas`, que hoje mostra a vitrine (e some quando não há vitrine publicada).
- **Importação por IA:** `import-quote-image`, `import-full-package`, `import-hotel-document`, `import-airfare-document`, `import-generic-service-document`, `ai-import-service`, e o hook `useQuoteImport`.
- **Leads:** `submit-lead-form` e o pedido pela Central de Solicitações (`useAgencySiteRequest`) já gravam origem no CRM.
- **Agendamentos:** o `pg_cron` já é usado no projeto.

## 2. Decisões e riscos
1. **Tabela nova, não coluna em `quotes`.** A oferta é uma cópia pública e limpa, com o próprio ciclo de vida. O orçamento nunca fica exposto. A ligação `source_quote_id` é só interna.
2. **Vitrine x Ofertas.** `/ofertas` hoje é da vitrine. Proposta: a página passa a mostrar as ofertas novas e, na mesma grade, as peças ativas da vitrine como "Divulgação". Nada é migrado. Decisão pendente: juntar as duas ou substituir a vitrine só nas agências com o módulo ligado.
3. **Limpeza feita no servidor.** O snapshot é montado por uma função do backend com lista fechada de campos permitidos (allowlist). O navegador nunca envia a oferta pronta.
4. **Publicação automática.** Só vale para orçamentos novos, depois que a agência liga a opção. Nunca é retroativa. O primeiro envio fica como "rascunho para revisão" quando falta foto, preço ou destino.
5. **Preço "a partir de".** Vem do menor total por pessoa, ou é digitado. O rótulo "promoção" só aparece se houver preço antigo informado. Sem isso, o texto é "oportunidade de viagem".
6. **Riscos:** vazar dados na cópia (mitigado com allowlist e teste automático); slug repetido (único por agência, com sufixo); conflito com a vitrine; custo de IA (reusar os limites diários que já existem); link encerrado nunca vira página de erro 404.

## 3. Modelo de dados (somente adições, com autorização do banco na fase 1)
```text
agency_offer_settings   (agency_owner_id PK, enabled, auto_publish_new_quotes,
                         default_validity_days=7, updated_at)
offers                  (id, agency_owner_id, created_by, source_quote_id NULL,
                         origin 'quote'|'manual'|'import', slug, status
                         'draft'|'scheduled'|'published'|'paused'|'expired'|'ended',
                         title, destination, category, service_types[],
                         travel_start, travel_end, nights, price_from, currency,
                         price_note, compare_at_price NULL, cover_url, gallery jsonb,
                         public_snapshot jsonb, publish_at, expires_at, ended_at,
                         views_count, leads_count, timestamps)
                         UNIQUE(agency_owner_id, slug)
offer_events            (id, offer_id, agency_owner_id, type view|cta|lead|status,
                         meta jsonb, created_at)
quotes.offer_opt_out    boolean NULL  (controle por orçamento: "não publicar")
```
- `public_snapshot` guarda só: textos de venda, itens de cada serviço (hotel, regime, voo resumido, noites), fotos e condições gerais. Não guarda cliente, contatos, observações internas, comissão, custo nem documentos.
- **Acesso (RLS):** a própria agência (dono e membros da equipe, pelo mesmo helper de dono já usado) pode ler e editar. O público não lê a tabela direto: lê por funções `get_public_offers(slug_agencia, filtros)` e `get_public_offer(slug_agencia, slug_oferta)`, que devolvem só snapshot e status. `offer_events` recebe registro do público só por função com limite de uso. GRANTs e RLS vão na mesma migração.
- **Quem vê o módulo:** `agency_offer_settings.enabled` e existir `agency_public_domains` ativo. Opcionalmente, também uma chave em `user_feature_access`.

## 4. Automações
- **Orçamento salvo → oferta:** função `offer-sync-from-quote`, chamada ao salvar ou publicar o orçamento, sem gatilho no banco. Ela cria ou atualiza a oferta apenas se a publicação automática estiver ligada, se `offer_opt_out` não estiver marcado e se a oferta não tiver sido editada à mão (sem sobrescrever o que a agência mudou).
- **Expiração:** `pg_cron` a cada 15 minutos roda `expire_offers()`, que muda `published` para `expired` quando `expires_at < now()` e `scheduled` para `published` quando `publish_at <= now()`. Nada é apagado. A leitura pública também confere o prazo em tempo real, para não depender só do agendamento.
- **Vigência:** publicar define `expires_at = publish_at + 7 dias`. Estender e republicar geram um novo prazo e registram evento.

## 5. Fluxo de uso
**Meus Projetos > Ofertas** (nova aba, sem item no menu principal, só com o módulo ligado)
- Filtros rápidos: Ativas | Agendadas | Pausadas. A ação "Ver histórico" mostra as encerradas e expiradas.
- Card ou linha: foto, destino, categoria, período, "a partir de", publicação, validade (com contagem regressiva), origem (Orçamento / Criada / Importada), visualizações e leads.
- Ações: Editar, Pausar/Ocultar, Estender, Copiar link, Republicar, Encerrar, Ver orçamento de origem.
- Botões: "Criar oferta", "Importar divulgação (IA)" e "Configurações" (publicação automática e prazo padrão).
- No editor de orçamento: chave "Publicar como oferta no site" (desmarcar grava `offer_opt_out`).

**Criar ou importar:** editor de oferta enxuto que reaproveita os formulários de serviço do orçamento, sem cliente e sem valores internos. A importação usa os mesmos importadores de IA, preenche o formulário e **exige revisão**: o botão Publicar só aparece depois de confirmar.

**Site público**
- `/ofertas`: grade com filtros combináveis (Todas, categoria, destino, mês da viagem, faixa de preço). Cada filtro mostra apenas opções que tenham ofertas ativas, calculadas a partir das próprias ofertas.
- `/ofertas/:slug`: detalhe com o conteúdo do orçamento em modo público (sem cliente), validade e botões "Quero esta oferta" (formulário) e WhatsApp.
- Oferta expirada ou encerrada: estado "Oferta encerrada" e botão "Solicitar nova cotação", que abre a Central com o destino já preenchido.
- Lead: enviado por `submit-lead-form` ou `useAgencySiteRequest` com `source = "site_oferta"` e `offer_id`. A mensagem de WhatsApp leva o título e o link da oferta. Cada lead soma em `leads_count`.

## 6. Reaproveitamento
- Formulários de serviço e galeria de fotos do orçamento; renderer `OrcamentoPublicoV2`, separado em "visão pública" que recebe o snapshot.
- `publicAgencyUrls.ts`: novo tipo `oferta` → `/{slug}/ofertas/{offerSlug}` ou domínio próprio `/ofertas/{offerSlug}`.
- `AgencySiteLayout` (a página de ofertas é institucional e fica dentro do layout do site), `useAgencySiteRequest`, `AgencyAssistLauncher`.
- `useQuoteImport` e os importadores do backend; limites de uso de IA; `useAdminNav()` para rotas no white label.

## 7. Rotas
- Painel: `/meus-projetos?tab=ofertas`, `/gestao/meus-projetos?tab=ofertas`, editor em `/gestao/criar/oferta[/:id]` e na plataforma `/ferramentas-ia/oferta[/:id]`.
- Site: `/ofertas` e `/ofertas/:slug` no domínio próprio; `vitrine.tur.br/{agencia}/ofertas[/:slug]` no endereço compartilhado.
- `isAgencyPublicToolPath` continua sem incluir `ofertas`, para a página seguir com cabeçalho e rodapé do site.

## 8. Fases
1. **Banco (depende de autorização):** tabelas, RLS, GRANTs, funções públicas, `expire_offers` e cron.
2. **Backend:** `offer-sync-from-quote` (allowlist e slug), `offer-track-event` e lead com `offer_id`.
3. **Painel:** aba Ofertas, configurações, ações de status e a chave no orçamento.
4. **Criar e importar:** editor, integração com a IA e revisão obrigatória.
5. **Site:** `/ofertas` com filtros, detalhe e estado encerrado. Primeiro fica atrás de chave desligada; depois é ligada só para uma agência piloto (sugestão: Destinos com a Ju).
6. **Testes e homologação.** Nada é publicado sem sua ordem.

## 9. Critérios de aceite
- Nenhum dado do cliente, contato, observação, comissão ou custo aparece nas respostas públicas (teste automático sobre o snapshot).
- Agência A não vê nem altera ofertas da agência B (teste de RLS).
- Com a publicação automática ligada, um orçamento novo gera oferta publicada por 7 dias. Com a opção desligada, ou com o orçamento marcado para não publicar, nenhuma oferta é criada.
- Pausar tira a oferta do site na hora. Estender e republicar geram novo prazo. Depois do vencimento, a oferta vai para o histórico e o link mostra "Oferta encerrada" com botão de nova cotação.
- Os filtros mostram só opções com ofertas ativas e funcionam juntos.
- Lead e WhatsApp chegam ao CRM com origem "site_oferta" e `offer_id`. Visualizações e leads aparecem no card.
- A importação por IA nunca publica sem revisão.
- A aba só aparece para agências com site e módulo ligados. A vitrine atual e os outros sites continuam iguais.
- Nenhuma tela usa a palavra "promoção" sem preço antigo informado.

## Pontos para você decidir
1. `/ofertas` junta as ofertas com a vitrine atual ou substitui a vitrine?
2. O módulo é liberado por plano (entitlement) ou só pela configuração da agência?
3. A oferta vinda de orçamento acompanha as mudanças do orçamento até alguém editá-la à mão, ou fica congelada desde o início?

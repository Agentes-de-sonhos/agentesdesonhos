---
name: Módulo Ofertas (piloto Destinos com a Ju)
description: Ofertas em Meus Projetos > Ofertas, snapshots públicos sanitizados, sync híbrido por campo, /ofertas e /ofertas/:slug sem WhatsApp, pedido via agency_site_requests
type: feature
---
- Só agências com `offer_settings.enabled` (hoje só Destinos com a Ju). Publicação automática desligada por padrão; só orçamentos `published`, sem retroatividade. Toggle "Publicar como oferta no site" (interno `offer_opt_out`).
- Oferta de orçamento exige preço > 0; "Consulte" só em manual por escolha explícita. Nunca R$ 0,00. "Promoção" só com preço anterior comprovado.
- Sync híbrido: `customized_fields` por campo; restaurar dados do orçamento.
- Público: lista só ativas; link direto mostra ativas/expiradas/encerradas; pausada = indisponível genérico. Filtros: categoria, destino, mês.
- Página da oferta sem WhatsApp (layout `noWhatsapp`); formulário único; snapshot imutável criado no servidor; consentimento versionado; conversão em orçamento rascunho idempotente.
- Expiração: estado derivado das datas + cron horário.

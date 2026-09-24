---
name: Essya Tur white-label site
description: essyatur.com.br (raiz) é a URL principal do site Essyatur; www redireciona; perfil essyaCurated / tema essyaEditorial
type: feature
---
- URL principal do tenant: **https://essyatur.com.br** (raiz). `canonicalRedirectHost("www.essyatur.com.br")` → "essyatur.com.br" (agencySiteContacts.ts).
- `agency_public_domains`: hostnames essyatur.com.br (is_primary=true) e www.essyatur.com.br (is_primary=false), user_id 4d5a7157-59b6-4329-8768-7f8895e8ce92, slug essyatur, admin_portal_enabled=true.
- No Lovable Domains, essyatur.com.br é o primary conectado; www não está mais listado como domínio web do projeto.
- Site Lab Base no ar (não mais "em construção"): perfil `essyaCurated`, tema `essyaEditorial` (raiz `wl-essya`), ambos resolvidos para os DOIS hostnames (raiz e www) em agencySiteProfile.ts / agencySiteTheme.ts / agencySiteContacts.ts / agencySiteBrand.ts.
- Contatos: WhatsApp (11) 96494-2210, contato@essyatur.com.br, @essyatur. Telefone do perfil (11) 96219-3690 inalterado.
- Teste focado: src/test/essya-tur-coming-soon.test.tsx (5 testes).
- DNS: zona essyatur.com.br usa nameservers da Locaweb (ns1–ns3.locaweb.com.br); o check de status reportou nameservers instáveis — se o site não abrir, revisar DNS na Locaweb.

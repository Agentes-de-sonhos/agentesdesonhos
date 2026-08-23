# Área do Cliente White Label — proteção da rota autenticada (Etapa 2)

## Contexto

O token de sessão do cliente final fica no `localStorage`, isolado por domínio
(`ads_client_area_session:<hostname>`), porque os domínios personalizados das
agências não compartilham cookies com a plataforma. Isso exige cuidado extra com
execução de scripts na rota autenticada.

## Medidas aplicadas no código

- Nenhum `dangerouslySetInnerHTML` nos componentes da Área do Cliente.
- Nenhum `<script>` externo, tag de marketing, pixel ou analytics carregado
  dentro da área autenticada.
- O token nunca aparece na URL: navegação de seções usa apenas `?area=`.
- O token não é enviado a analytics nem registrado em log; as Edge Functions
  não logam senha, hash ou token (teste estático garante).
- Mensagens de erro são genéricas e nunca contêm token ou dado pessoal.
- Somente `?login=<e-mail>` é aceito da query string; qualquer outro parâmetro é
  ignorado.
- Imagens externas permitidas: apenas o logotipo/capa da própria agência
  (Supabase Storage) — sem HTML de terceiros.

## Limitação de CSP

A hospedagem serve um único `index.html` para todo o SPA e não permite headers
HTTP por rota. Uma CSP em `<meta http-equiv>` seria global e quebraria recursos
legítimos de outras áreas da plataforma (Google Maps/Places, Stripe, YouTube,
uploads, PDF/canvas). Por isso:

- **Não** foi adicionada CSP global nesta etapa (evitando regressão na
  plataforma).
- A proteção compatível foi aplicada no nível da aplicação (itens acima).
- Quando a camada de hospedagem permitir headers por rota, aplicar em
  `/area-do-cliente`:
  `default-src 'self'; img-src 'self' https: data:; connect-src 'self' https://*.supabase.co; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`.

## Scripts externos ainda necessários na Área do Cliente

Nenhum. A rota usa apenas o bundle da própria aplicação e chamadas HTTPS à Edge
Function `client-area-auth`.

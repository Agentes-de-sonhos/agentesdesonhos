## Objetivo
Transformar `/noticias` em hub completo, automático e colaborativo com todas as notícias de PANROTAS, Mercado & Eventos e Brasilturis, priorizadas pelos acessos e curtidas dos próprios agentes.

## Aproveitamento do que já existe
- **Mantém tabelas**: `noticias_brutas`, `noticias_dashboard`, `news_likes`, `news_curation_feedback`.
- **Mantém**: hook `useNewsLikes`, botão `NewsLikeButton`, feedback de curadoria.
- **Reaproveita**: função `curate-news` (IA de classificação) — reutilizada, mas agora publica direto (status `aprovado` automático).
- **Preserva histórico**: nada é apagado.

## Fase 1 — Banco de dados (migração única)

1. **Ampliar categorias** em `noticias_dashboard`: aceitar as 14 novas categorias. Sem CHECK constraint estrita (usar `text`). Manter `Turismo` legado como sinônimo → mapeado para `Outros` no fallback do backend.
2. **Nova tabela `news_reads`** — registro de acesso real ao portal:
   - `noticia_id`, `user_id`, `read_at`
   - UNIQUE (noticia_id, user_id, date_bucket) — 1 acesso válido por usuário por dia
   - RLS: authenticated pode inserir os seus; admin lê tudo
3. **Colunas em `noticias_dashboard`**:
   - `reads_count int default 0` (denormalizado — atualizado via trigger)
   - `likes_count int default 0` (denormalizado via trigger em `news_likes`)
   - `hidden bool default false` (para admin ocultar)
   - `classification_confidence numeric` (opcional, já existe similar)
4. **Triggers**: incrementar/decrementar `reads_count` e `likes_count`.
5. **View/RPC `news_ranking_top5(window text)`**: janela `day` ou `week`, retorna 5 mais pontuadas com `score = reads_count + likes_count*2` (com desempate por curtidas > acessos recentes > mais recente).
6. **RLS `noticias_dashboard`**: authenticated pode SELECT onde `status='aprovado' AND hidden=false`; admin gerencia tudo.
7. **Coleção `news_collector_runs`** (log de execuções): portal, iniciado_em, terminou_em, encontradas, inseridas, ignoradas_duplicadas, erros_json, status.

## Fase 2 — Coleta automática (Edge Functions)

Criar/atualizar edge functions:
- `collect-panrotas` — scraper RSS/HTML de panrotas.com.br
- `collect-mercado-eventos` — scraper de mercadoeeventos.com.br
- `collect-brasilturis` — scraper de brasilturis.com.br
- `process-noticias-brutas` — pega não processadas, chama Gemini (`curate-news` reaproveitada) e insere em `noticias_dashboard` já com `status='aprovado'`. Quando confiança < limite → categoria `Outros`.
- `news-collector-orchestrator` — chama os 3 coletores + processa brutas em sequência. Registra log em `news_collector_runs`.

**Cron (pg_cron + pg_net)**: schedule chamando `news-collector-orchestrator` em `0 8,10,12,14,16,18,20 * * *` (UTC ajustado para America/Sao_Paulo = `0 11,13,15,17,19,21,23 * * *`).

Cada coletor:
- Só busca conteúdos novos (verifica `noticias_brutas.url` UNIQUE).
- Não elimina notícias apenas por tema duplicado.
- Ignora páginas institucionais, links quebrados e sem conteúdo.

## Fase 3 — Reformulação da UI `/noticias`

Reescrever `src/pages/Noticias.tsx` (sem imagens, sem banner NEWS):

### Cabeçalho compacto
- Título: "Notícias do Trade"
- Subtítulo: "Todas as notícias do turismo em um só lugar, organizadas pelo interesse dos agentes de viagens."
- Direita (admin): botão "Editar no Admin"
- Linha meta: "Atualizado há X min · Próxima às HHh · N novas em 24h"

### Filtros (2 níveis)
- **Nível 1**: `Destaques do Trade` (padrão) | `Todas as notícias`
- **Nível 2**: seletor de Categoria (15 opções) + seletor de Portal (4 opções, combináveis)
- Campo de busca "Buscar notícias"
- Em mobile: scroll horizontal snap

### Aba "Destaques do Trade"
- **Segunda a sexta**: "Notícia do Dia" (card grande, sem imagem) + "Top 5 do Dia" (posições 2–5 ao lado). Ranking = eventos do dia atual (fuso SP).
- **Sábado e domingo**: "Notícia da Semana" + "Top 5 da Semana" (desde segunda 00h).
- Abaixo: seções "Notícias por Categoria" (até 6 por categoria + "Ver todas").

### Aba "Todas as notícias"
- Seletor de janela: 24h (padrão dias úteis) / Hoje / Esta semana (padrão fim de semana).
- Ordenação: Mais recentes (padrão) | Mais relevantes | Mais acessadas | Mais curtidas.
- Paginação "Carregar mais notícias".

### Card de notícia (sem imagens)
Estrutura: `Portal · Categoria · Há X min` / Título / Resumo 2–3 linhas / `N leituras · N curtidas` / Botões `[Curtir]` `[Ler matéria ↗]`.
- Etiquetas discretas: "Notícia do Dia/Semana", "Em alta", "Nova".

### Realtime/refresh
- Polling 60s para verificar novas notícias (24h). Se novas → banner "5 novas notícias disponíveis · Exibir".
- Não muda o scroll até o usuário clicar.

### Contagem de leitura
Ao clicar "Ler matéria":
1. `supabase.rpc('register_news_read', { p_noticia_id })` (idempotente por dia).
2. Abre `window.open(url, '_blank', 'noopener,noreferrer')`.
3. Otimista: incrementa contador local.

## Fase 4 — Painel administrativo

Reformar `AdminNewsManager` (ou criar novo):
- Cards KPI: última coleta, próxima, encontrado/inserido/ignorado por portal, erros, links quebrados, notícias em "Outros".
- Botão "Executar coleta manual agora".
- Tabela de notícias: colunas Título, Portal, Categoria, Score, Confiança, Leituras, Curtidas, Status, Ações (editar título/resumo/categoria, ocultar, restaurar).
- Histórico de execuções (`news_collector_runs`).

## Fase 5 — Limpeza
- Remover imports/uso do banner "NEWS" gigante e miniaturas de portal em `Noticias.tsx`.
- Manter `NewsLikeButton` (já sem imagem).
- SEO: `<title>Notícias do Trade | Agentes de Sonhos</title>`.

## Fora do escopo desta rodada
- Antibot avançado, ML customizado (reaproveita Gemini já em uso).
- Notificações push.
- App mobile.

## Ordem de execução
1. Migração de banco (Fase 1)
2. Edge functions e cron (Fase 2)
3. UI /noticias (Fase 3)
4. Painel admin (Fase 4)
5. Limpeza + testes (Fase 5)

## Notas técnicas
- IA: `curate-news` já usa Lovable AI Gateway (Gemini). Reutilizar para classificação e resumo em lote.
- Ranking em SQL para performance; nada de recalcular no cliente.
- Registro de leitura idempotente via UNIQUE (`noticia_id`, `user_id`, `date_trunc('day', read_at)`).
- Fuso: `AT TIME ZONE 'America/Sao_Paulo'` em todas as janelas.

## Estimativa
Grande — implementação em várias iterações. Recomendo começar pela Fase 1 (schema) e Fase 3 (UI reformulada usando dados atuais + novo ranking) para o usuário validar UX, e Fase 2 (scrapers) em rodada dedicada.

**Confirma para começar pela Fase 1 (migração) + Fase 3 (UI reformulada com auto-publicação) e depois seguir com scrapers?**
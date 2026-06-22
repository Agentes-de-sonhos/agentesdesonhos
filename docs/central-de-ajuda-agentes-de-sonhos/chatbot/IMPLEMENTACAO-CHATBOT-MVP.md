# Implementação — Chatbot MVP
## Assistente da Central de Ajuda do Agentes de Sonhos

## Objetivo

Disponibilizar um assistente conversacional, consultivo e seguro, dentro da área autenticada da plataforma, para ajudar usuários a entender e usar o Agentes de Sonhos com base na documentação oficial das Ondas 1 e 2.

O assistente **não executa ações** no sistema e **não substitui o suporte humano**. É um guia de uso baseado na Central de Ajuda.

## Escopo

### Módulos contemplados — Onda 1
CRM e Oportunidades · Gestão de Clientes · Operações · Orçamentos · Carteira Digital · Roteiros · Financeiro (Visão Geral) · Vendas · Comissões e Vendedores · Equipe e Permissões.

### Módulos contemplados — Onda 2
Entradas · Despesas · Faturas · Suporte · Configurações, Conta e Onboarding · Agenda.

### Fora de escopo (responde com fallback)
Captação de Leads, Marketing, Materiais, Bloqueios Aéreos, Mapa do Turismo, Raio-X do Hotel, Travel Advisor, Requisitos de Viagem, Benefícios, EducaTravel Academy, Cursos, Mentorias, Notícias, Comunidade, Ferramentas de IA, Planos e Assinatura, Painel do Fornecedor, Admin.

## Arquitetura

```
┌──────────────────────────────┐
│  HelpAssistantWidget (UI)    │ Front (área autenticada)
│  - Botão flutuante (BR)      │
│  - Painel/Sheet responsivo   │
│  - Sugestões, feedback       │
└──────────────┬───────────────┘
               │  supabase.functions.invoke
               ▼
┌──────────────────────────────────────────────┐
│  Edge Function  help-assistant-chat          │
│  1. Autentica (JWT)                          │
│  2. Rate limit (20/min por usuário)          │
│  3. Sanitiza pergunta (1000 chars, anti-segr)│
│  4. Recupera chunks RAG (ranking textual)    │
│  5. Monta prompt seguro + histórico curto    │
│  6. Chama Lovable AI Gateway                 │
│  7. Persiste conversa/mensagens/fontes       │
│  8. Registra perguntas sem resposta          │
└──────────────┬───────────────────────────────┘
               ▼
   ┌──────────────────────────────┐
   │  help_center_chunks          │ 764 chunks (Ondas 1+2)
   │  status=pronto & conf=confirm│
   └──────────────────────────────┘
```

Adicionais:
- `help-assistant-feedback`: registra polegar ↑/↓ por mensagem.
- `help-assistant-sync-rag`: importa/atualiza chunks a partir do JSONL embarcado (admin-only).

## Tabelas criadas

| Tabela | Função |
|---|---|
| `help_center_chunks` | Armazena os 764 chunks confirmados da Central de Ajuda |
| `help_assistant_conversations` | Conversas por usuário |
| `help_assistant_messages` | Mensagens (user/assistant) com `sources` e `fallback_used` |
| `help_assistant_feedback` | Avaliação ↑/↓ por mensagem (única por usuário+mensagem) |
| `help_assistant_unanswered` | Perguntas sem chunks relevantes — para curadoria futura |

RLS:
- Conversas, mensagens e feedback escopados por `auth.uid()`.
- `help_center_chunks` legível por qualquer usuário autenticado (somente leitura).
- `help_assistant_unanswered` só admin (`has_role`) lê; usuários só inserem suas próprias.

## Edge Functions

| Função | verify_jwt | Quem chama |
|---|---|---|
| `help-assistant-chat` | true (default) | UI autenticada |
| `help-assistant-feedback` | true (default) | UI autenticada |
| `help-assistant-sync-rag` | true (default) | Admin (re-importa chunks) |

## Componentes criados

- `src/components/help-assistant/HelpAssistantWidget.tsx`
  - Botão flutuante inferior-direito (não conflita com WhatsApp à esquerda).
  - Painel/sheet responsivo (fullscreen no mobile, lateral no desktop).
  - Sugestões rápidas (8 atalhos baseados nas Ondas 1+2).
  - Aviso de privacidade (não enviar dados sensíveis).
  - Render Markdown via `react-markdown`.
  - Botão "Limpar conversa" e "Abrir chamado no Suporte".
  - Feedback ↑/↓ por mensagem.
  - Esconde em rotas públicas (carteira, orçamento, roteiro, vitrine, cartão, landing, auth, etc.) e quando não há usuário autenticado.

Montado em `src/App.tsx` ao lado do `WhatsAppSupportButton`.

## Regras de fallback aplicadas (sistema)

O prompt de sistema (`SYSTEM_PROMPT` em `help-assistant-chat/index.ts`) reflete integralmente:

- `chatbot/FALLBACK-E-ESCALONAMENTO.md`
- `chatbot/CONTEUDOS-NAO-PUBLICAVEIS.md`
- `37-DECISOES-RESOLVIDAS-CHATBOT-MVP.md`

Pontos de bloqueio explícito no prompt:
- Não promete SLA, NF integrada, recorrência nativa, baixa automática, sincronização bidirecional total, propagação automática de logo/cor.
- Não expõe nomes de tabelas, Edge Functions, migrations, políticas, secrets, dados reais.
- Não orienta burlar permissões, não aceita senhas/cartões.
- Encaminha ao Suporte em situações sensíveis (financeiro, permissões, integrações, exclusões).

Adicionalmente, o backend detecta padrões sensíveis (números de cartão, "senha=...", "cvv=...") e bloqueia o envio para a IA com mensagem amigável.

## Limites do MVP

O chatbot **não pode**: criar, editar, excluir, cancelar, mover, pagar, emitir, conectar, sincronizar, alterar permissões/dados de conta, ou expor dados reais de registros específicos. É apenas consultivo.

## Como atualizar a base RAG

1. Edite o arquivo `docs/central-de-ajuda-agentes-de-sonhos/rag/BASE-RAG.jsonl`.
2. Regenere o snapshot embarcado:
   ```bash
   python3 -c "
   import json
   data=[json.loads(l) for l in open('docs/central-de-ajuda-agentes-de-sonhos/rag/BASE-RAG.jsonl') if l.strip()]
   json.dump(data, open('supabase/functions/help-assistant-sync-rag/rag-data.json','w'), ensure_ascii=False)
   "
   ```
3. Faça deploy (automático ao salvar).
4. Um administrador chama a Edge Function `help-assistant-sync-rag` (UI futura ou via `supabase.functions.invoke('help-assistant-sync-rag')` no console autenticado como admin). A função filtra apenas chunks com `status=pronto` e `confidence=confirmado` e faz `upsert` em lotes.

## Como testar

Veja `RELATORIO-IMPLEMENTACAO-CHATBOT-MVP.md` (seção Testes) para o roteiro completo.

Fluxo mínimo:
1. Faça login na área autenticada.
2. Clique no ícone de ajuda (canto inferior direito).
3. Use uma sugestão rápida ou digite uma pergunta.
4. Verifique resposta + bloco de Fontes + botão de feedback.

## Pendências futuras

- UI administrativa para curadoria de `help_assistant_unanswered` e visualização de métricas de feedback.
- Botão de re-sync do RAG dentro do painel Admin.
- (Opcional) Busca semântica via embeddings (não bloqueador — busca textual atende ao MVP).
- Modo "explicar passo a passo" com screenshots/links profundos (depende de Onda 3).
- Histórico de conversas anteriores (atualmente conversa única por sessão; a tabela já suporta múltiplas).
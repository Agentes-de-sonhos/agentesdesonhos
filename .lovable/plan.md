## Central de Requisitos de Viagem — Plano de Implementação

Nova funcionalidade premium que valida elegibilidade de embarque do passageiro (documentação, vistos, vacinas, regras migratórias) usando IA + fontes oficiais.

### 1. Banco de dados (1 migration)

Tabela `travel_requirements_consultations`:
- `user_id`, `client_id` (opcional, link futuro com CRM)
- `passenger_data` (jsonb): nacionalidade, residência, nome, nascimento, menor, desacompanhado, passaporte (nº/validade/emissor), vistos
- `trip_data` (jsonb): destino, conexões[], datas, cia aérea, tipo de viagem
- `result` (jsonb): status geral + 6 blocos estruturados
- `confidence_score`, `consulted_at`, `model_used`
- RLS: dono vê/edita/apaga só os próprios

### 2. Edge Function: `check-travel-requirements`

- Recebe `passenger_data` + `trip_data`
- Chama Lovable AI (`google/gemini-2.5-pro` para precisão) com **tool calling** estruturado
- Schema do tool retorna JSON com:
  - `overall_status`: `apt` | `attention` | `not_apt`
  - `confidence`: 0–1
  - `documentation`: passaporte/RG/CNH, validade mínima, páginas em branco, comprovantes
  - `visas`: tipo (Visto/ETA/eTA/ESTA), prazo, custo, antecedência, link oficial
  - `health`: vacinas, certificados, seguro mínimo
  - `alerts[]`: `severity` + `message` (gerados a partir do cruzamento dos dados)
  - `official_sources[]`: nome, url, última atualização aproximada
  - `observations[]`
- Prompt do sistema instrui IA a NUNCA inventar; quando incerto, marcar `confidence` baixo e exibir aviso
- Salva resultado em `travel_requirements_consultations`
- Sanitiza erros em PT-BR

### 3. Frontend

**Página nova:** `src/pages/RequisitosViagem.tsx` (rota `/requisitos-viagem`)

**Componentes:** `src/components/travel-requirements/`
- `PassengerStep.tsx` — Etapa 1 (dados do passageiro)
- `TripStep.tsx` — Etapa 2 (viagem + conexões dinâmicas)
- `ConnectionItem.tsx` — bloco recolhível por conexão (mesmo padrão do gerador de roteiros)
- `RequirementsResult.tsx` — dashboard de resposta:
  - Header com status colorido (verde/amarelo/vermelho) + score de confiança
  - 6 blocos colapsáveis (Documentação, Vistos, Saúde, Alertas, Links Oficiais, Observações)
  - Disclaimer fixo no rodapé
- `GeneratePdfButton.tsx` — gera PDF premium com jsPDF + html2canvas (padrão já usado no projeto)

**Hook:** `src/hooks/useTravelRequirements.ts` — invoca edge function, gerencia loading/erro, salva histórico

### 4. Menu e navegação

- Adicionar item "Central de Requisitos" em `src/config/menuConfig.ts` com ícone `ShieldCheck`
- Registrar rota em `src/App.tsx` (lazy load)
- Gate por plano: **Premium** via `<FeatureGate>` (alinha com posicionamento "premium" do pedido)

### 5. PDF

- Reuso do padrão `generateBusinessCardPdf` (html2canvas scale 2x + jsPDF)
- Template com identidade do agente (logo via `useAgentProfile`), todos os blocos, alertas destacados, links clicáveis (`doc.link`), data/hora da consulta, disclaimer

### 6. Preparação para integrações futuras

- `client_id` nullable na tabela permite linkar com CRM depois
- Hook exporta `consultRequirements(payload)` reutilizável → futuramente chamado de Roteiros/Orçamentos/Carteira com prompt "Deseja verificar os requisitos?"
- Resultado em jsonb permite expor via Carteira pública futuramente

### Detalhes técnicos

```text
Fluxo:
[Form Wizard 2 etapas] → [Edge Function] → [Lovable AI Tool Call]
        ↓                      ↓                    ↓
  Validação Zod         Salva consulta         JSON estruturado
                              ↓
                      [Dashboard Result] → [PDF Premium]
```

**Stack:** React + Tailwind tokens semânticos, framer-motion para entrada dos blocos, lucide-react ícones (ShieldCheck, AlertTriangle, FileCheck, Syringe, ExternalLink), shadcn `Collapsible` + `Badge` + `Alert`.

**Modelo IA:** `google/gemini-2.5-pro` (precisão > velocidade para regras migratórias). Tool calling força saída estruturada — sem texto corrido.

**Sem APIs externas pagas neste primeiro release** — Timatic/IATA fica no roadmap. A IA é organizadora; sempre exibe links oficiais e disclaimer.

### O que NÃO entra agora (roadmap)
- Monitoramento automático de mudanças, cache cross-user, tradução PT/EN/ES, integrações WhatsApp/e-mail, score de risco avançado, painel de países mais consultados, integração Timatic.
- Auto-sugestão dentro de Roteiros/Orçamentos/Carteira (deixa hook pronto, plugamos depois).

Confirma para eu implementar?

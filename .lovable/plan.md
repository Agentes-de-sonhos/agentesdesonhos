# Auditoria: Modelos de Roteiro, Bloco de Notas e extensão para Orçamento/Carteira

Auditoria somente leitura. Nada foi editado nem publicado.

## 1. Modelo de Roteiro — comportamento atual confirmado no código

**Salvar como modelo:** `SaveAsTemplateDialog.tsx` (aberto em `CriarRoteiro.tsx:1551`) achata `days[].activities[]` em lista plana e chama `createTemplate` em `useItineraryTemplates.ts:121-155` — dois `insert` diretos (`itinerary_templates`, depois `itinerary_template_activities`). Sem RPC, sem transação.

**Criar roteiro a partir do modelo:** `ModelosRoteiros.tsx` → `InstantiateTemplateDialog` → `instantiateFromTemplate` (`useItineraryTemplates.ts:236-351`): lê modelo + atividades, insere 1 `itineraries`, os `itinerary_days` do novo período e as `itinerary_activities`, remapeando `day_number` proporcionalmente quando a duração muda.

**Tabelas/campos**
- `itinerary_templates`: id, user_id, name, destination, cover_image_url, nights_count, style, profile, pace, tags[], interests[], destination_intro_text, destination_intro_images, additional_preferences, source_itinerary_id, timestamps.
- `itinerary_template_activities`: id, template_id, day_number, period, order_index, title, description, location, estimated_duration, estimated_cost, photo_url, category, priority.
- Destino/origem: `itineraries`, `itinerary_days`, `itinerary_activities`, `itinerary_period_images`.

**Preservado:** destino, capa, intro de destino (texto + imagens), nº de noites (editável antes de salvar), estilo/perfil (derivados de `budget_level`/`trip_type`), `source_itinerary_id` como rastro; por atividade: título, descrição, local, duração, custo estimado, período, ordem e `photo_url`.

**Limpo / não copiado:** cliente (`client_id`), datas, passageiros, headline, seção e conteúdo de preços, assinatura (`signature_snapshot`), `public_access_code`/`share_token`/`share_expires_at`, status (novo roteiro nasce `review`), timestamps (novos), `document_urls`, `maps_url`, `is_approved` (volta a false), `linked_trip_service_id` e todas as `itinerary_period_images`. `user_id` do modelo é sempre o usuário logado.

**Cópia profunda x referência:** textos e metadados são cópia real (novas linhas/IDs). Imagens são **referência compartilhada** — apenas a URL de storage é copiada; nada é reenviado. Se a imagem original for apagada, modelo e roteiros derivados quebram.

**Permissões/RLS:** `itinerary_templates` e `itinerary_template_activities` têm apenas políticas por dono (`auth.uid() = user_id`, e via template pai). Não há coluna de agência nem políticas de equipe — diferente de `itineraries`, que tem `master_agency_itineraries_all` e `team_itineraries_*`. Grants padrão do schema public.

**Limitações/inconsistências**
- Modelos não são compartilhados com a equipe/agência, ao contrário dos roteiros.
- Escritas não atômicas: falha parcial deixa modelo sem atividades ou roteiro sem atividades (contraste com a RPC `clone_itinerary_for_trip`).
- `needsAdaptation` é calculado e nunca persistido (coluna não existe).
- `category`/`priority` são gravados no modelo e nunca lidos na instanciação.
- Divergência de enum: `moderado` (modelo) x `conforto` (roteiro), remapeada em código.
- Remapeamento de dias é ingênuo: o descarte de atividades opcionais ao encurtar é um no-op.
- `duplicateTemplate` propaga `user_id` da origem via spread.

## 2. Textos Prontos — situação atual

Rota `/bloco-notas` (`App.tsx:337`), página `src/pages/BlocoNotas.tsx` (também embutida como aba em `MeusProjetos.tsx`), componentes `src/components/notes/*`, hook `useNotes`, tabela `notes` (id, user_id, title, content, is_favorite, is_template, client_id, opportunity_id, event_id, timestamps) com RLS somente do dono. Não aparece no menu white-label (`agencyAdminMenu.ts`).

**Renomear só o rótulo não basta.** "Bloco de Notas" está escrito literalmente em: `config/menuConfig.ts`, `layout/AppSidebar.tsx`, `layout/BottomNavBar.tsx`, `layout/MobileDrawerMenu.tsx`, `layout/MobileSidebar.tsx`, `dashboard/AgentToolsCard.tsx`, `lib/gamification.ts`, `workspace/routeTitle.ts`, aba em `MeusProjetos.tsx` e no rodapé de exportação em `BlocoNotas.tsx`. O vocabulário interno é "Nota" e "Modelo" (nunca "Anotações" nem "Template"). Dados não precisam mudar: só rótulos. Atenção: `TemplatePickerButton`/`TextareaWithTemplate` leem `notes` com `is_template = true` e são usados em `quote/ServiceForms.tsx`, `quote/flight-wizard/FlightWizard.tsx` e `trip/TripServiceForms.tsx` — o rebrand deve manter esse vocabulário coerente nesses pontos.

## 3. Recomendação para Modelos de Orçamento e Carteira

Já existe base pronta: `useQuotes.duplicateQuote` e `useTrips.duplicateTrip` (que regenera `share_token`/`access_password`, zera `opportunity_id`/`itinerary_id` e descarta vouchers/anexos). Modelos devem ir além, removendo também cliente e dados de reserva.

**Entidades próprias, seguindo o padrão do roteiro** (não reaproveitar `quotes`/`trips` com flag, para não poluir listagens, RLS, links públicos e financeiro):
- `quote_templates` + `quote_template_services`
- `trip_templates` + `trip_template_services`

**Preservar:** título/nome do modelo, destino, estrutura de serviços (tipo, descrição, `service_data` sanitizado, ordem, seções/grupos de escolha, `option_label`), textos comerciais (whats_included, intro de destino, disclaimers), preferências de exibição (mostrar preços, layout de investimento), moeda e modo de conversão, imagens por URL, categorias da carteira.

**Limpar obrigatoriamente:** cliente (`client_id`, `client_name`), `opportunity_id`, passageiros/viajantes e documentos (CPF, passaporte, nascimento, arquivos), datas de viagem e validade, vouchers/anexos de reserva, `public_access_code`/`share_token`/`share_expires_at`, `access_password`/`is_locked`/`failed_password_attempts`, `signature_snapshot`, status/aprovações, vínculos com roteiro/operação/fatura/financeiro, timestamps.

**Regenerar na criação:** novo id, novas datas informadas pelo usuário, novos códigos/tokens públicos, senha nova (se a carteira usar), status inicial rascunho, assinatura recomposta a partir da assinatura vigente da agência no momento do uso.

**Decisão sugerida sobre preços:** salvar valores como opcionais no modelo, com escolha explícita no diálogo de salvar ("manter valores" x "estrutura sem valores"), e condições de pagamento preservadas como texto/estrutura padrão.

**Compatibilidade:** nada muda em `itinerary_templates`; a listagem de modelos passa a ser uma tela única com abas Roteiro / Orçamento / Carteira, cada aba consultando sua própria tabela.

**Fluxo de interface (igual para os três):** botão "Salvar como modelo" no editor → diálogo com nome, destino e opções de limpeza; lista de modelos com busca, "Usar modelo" (abre diálogo pedindo cliente, datas e passageiros), "Duplicar", "Renomear" e "Excluir".

**Recomendação técnica:** implementar salvar/instanciar via RPC `SECURITY DEFINER` atômica (como `clone_itinerary_for_trip`), incluir `agency`/equipe nas políticas desde o início e replicar isso para os modelos de roteiro.

## 4. Matriz preservar | limpar | regenerar

| Item | Roteiro (atual) | Orçamento (recomendado) | Carteira (recomendado) |
|---|---|---|---|
| Cliente | limpar | limpar | limpar |
| Datas | limpar | limpar | limpar |
| Passageiros/viajantes | limpar | limpar | limpar (inclui documentos) |
| Destino/título | preservar | preservar | preservar |
| Serviços/atividades | preservar | preservar (sanitizado) | preservar (sanitizado) |
| Descrições/textos | preservar | preservar | preservar |
| Fotos | preservar (referência) | preservar (referência) | preservar (referência) |
| Anexos/vouchers | limpar | limpar | limpar |
| Maps/Places | limpar (hoje) | preservar | preservar |
| Valores | não se aplica | opcional (escolha do usuário) | opcional |
| Pagamentos | limpar | preservar condições, limpar valores pagos | limpar |
| Status/aprovações | regenerar | regenerar (rascunho) | regenerar |
| Assinatura | limpar | regenerar | regenerar |
| Links públicos/senha | regenerar | regenerar | regenerar |
| Vínculos operação/financeiro | limpar | limpar | limpar |
| Timestamps | regenerar | regenerar | regenerar |

## 5. Decisões que preciso confirmar com você

1. Modelos devem ser visíveis para a equipe/agência ou permanecer por usuário? (hoje: por usuário)
2. Modelo de orçamento guarda valores e condições de pagamento ou só a estrutura?
3. Modelo de carteira inclui o roteiro vinculado (clonando-o) ou apenas serviços?
4. Corrigir agora as inconsistências do modelo de roteiro (atomicidade, imagens de período, enum, `needsAdaptation`) ou tratar em tarefa separada?
5. Renomear "Bloco de Notas" para "Textos Prontos" em todos os pontos e no rodapé de exportação, mantendo "Modelo" como termo interno?

Custo em créditos: não tenho acesso a esse valor; ele fica disponível no painel de uso do projeto.

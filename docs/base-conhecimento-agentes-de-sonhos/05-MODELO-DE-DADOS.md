# 05 — Modelo de dados

[← Índice](./00-LEIA-ME-E-INDICE.md)

> **CONFIRMADO** quanto à existência das tabelas (listadas pelo introspector do Supabase). Os campos principais foram inferidos por nomes e uso. Para o esquema exato, consultar o introspector ou as migrations em `supabase/migrations/` (346 arquivos).

## Visão por domínio

### Identidade, perfil e equipe

| Entidade | Finalidade | Campos principais (inferidos) | Relacionamentos | Módulo | Proteção |
|---|---|---|---|---|---|
| `profiles` | Perfil do usuário/agência | id (= auth.uid), full_name, agency_name, branding, telefone | 1:1 com `auth.users` | Conta | RLS por `id` |
| `user_roles` | Papéis administrativos | user_id, role (`app_role`) | FK `auth.users` | Auth | RLS, leitura via `has_role()` |
| `user_feature_access` | Acesso granular a features | user_id, feature_key, granted | — | Permissões | RLS |
| `agency_team_members` | Membros da equipe | agency_id, name, email, role | FK `profiles` | Equipe | RLS |
| `agency_team_member_secrets` | Hash de senha do membro | member_id, password_hash | — | Equipe | RLS restrita |
| `agency_team_permissions` | Permissões por módulo | member_id, module, can_* | — | Equipe | RLS |
| `agency_team_stage_permissions` | Permissões por estágio do funil | member_id, stage_id | — | Equipe | RLS |
| `agency_team_sessions` | Sessões ativas de membro | member_id, token_hash, expires_at | — | Equipe | RLS |
| `agency_team_audit_log` | Auditoria de equipe | member_id, action, payload | — | Equipe | RLS admin |
| `impersonation_logs` | Log de impersonação | admin_id, target_user_id, started_at | — | Admin | RLS admin |
| `admin_action_logs` | Ações administrativas | admin_id, action, target | — | Admin | RLS admin |
| `user_presence` | Presença / heartbeat | user_id, last_seen | — | Analytics | RLS |
| `user_sessions` | Sessões de uso | user_id, started_at, ended_at | — | Analytics | RLS |

### CRM e operação

| Entidade | Finalidade |
|---|---|
| `clients`, `client_categories`, `client_subcategories`, `perfis_cliente` | Cadastro de clientes/passageiros |
| `opportunities`, `opportunity_history`, `opportunity_notes`, `opportunity_followups`, `opportunity_label_assignments`, `opportunity_labels`, `pipeline_stages` | Funil e oportunidades |
| `operations`, `operation_tasks`, `operation_timeline`, `operation_label_assignments`, `operation_labels`, `operation_pipeline_stages`, `operation_attachments`, `operation_checklist_templates`, `operation_stage_checklist_templates` | Acompanhamento operacional |
| `crm_contacts`, `crm_card_captures`, `crm_email_logs`, `crm_email_templates` | Contatos auxiliares, OCR de cartões, e-mails |

### Orçamentos, roteiros, carteiras

| Entidade | Finalidade |
|---|---|
| `quotes`, `quote_services`, `quote_documents` | Orçamentos e itens |
| `itineraries`, `itinerary_days`, `itinerary_activities`, `itinerary_period_images`, `itinerary_templates`, `itinerary_template_activities` | Roteiros (com modelos) |
| `trips`, `travelers`, `traveler_documents`, `trip_services`, `trip_itinerary_activities`, `trip_itinerary_period_images`, `trip_reminders`, `trip_edit_history` | Viagens, passageiros, serviços, roteiro real |
| `air_blocks`, `flight_blocks`, `flight_cache`, `flight_status_updates` | Aéreo |
| `hotels`, `hotel_recommendations`, `hotel_rx_cache` | Hotelaria |
| `place_cache` | Cache do Google Places |
| `activity_photo_cache` | Cache de fotos de atividades |

### Financeiro

| Entidade | Finalidade |
|---|---|
| `sales`, `sale_products`, `sales_goals` | Vendas e metas |
| `income_entries`, `expense_entries` | Entradas e despesas |
| `customer_payments`, `monthly_payments` | Recebimentos |
| `booking_*` (`bookings`, `booking_services`, `booking_payments`, `booking_documents`, `booking_commissions`) | Estrutura alternativa de reservas |
| `invoices`, `invoice_services`, `invoice_installments`, `invoice_payments` | Faturas |
| `commissions` (via `booking_commissions`), `sellers`, `supplier_payments` | Comissões e pagamentos a fornecedores |
| `financial_goals` | Metas financeiras |

### Marketing, vitrine, cartão

| Entidade | Finalidade |
|---|---|
| `agency_showcases`, `showcase_items`, `showcase_auto_overrides`, `showcase_stats`, `vitrine_categories` | Vitrine de ofertas |
| `business_cards`, `business_card_stats`, `card_activations`, `admin_quick_access_tokens` | Cartão de visitas digital |
| `sales_landings`, `sales_landing_leads`, `sales_landing_views` | Landings de vendas |
| `lead_capture_forms`, `lead_captures` | Captação de leads |
| `promoter_presentations`, `promoter_presentation_usage`, `promoter_settings`, `promoter_monthly_winners`, `raffles`, `raffle_winners` | Programa de promotores |
| `materials`, `media_files`, `media_folders` | Materiais e media manager |

### Conteúdo e educação

| Entidade | Finalidade |
|---|---|
| `learning_trails`, `trail_trainings`, `trail_materials`, `trail_linked_materials`, `trail_speakers`, `trail_exam_questions`, `trail_exam_options`, `trainings`, `paid_trainings`, `professional_workshops` | EducaTravel Academy |
| `marketplace_courses`, `marketplace_modules`, `marketplace_lessons`, `marketplace_lesson_progress`, `marketplace_enrollments`, `marketplace_meetings`, `marketplace_comments` | Marketplace de cursos |
| `mentorships`, `mentorship_modules`, `mentorship_lessons`, `mentorship_videos`, `mentorship_materials`, `mentorship_meetings` | Mentorias |
| `quiz_questions`, `quiz_options`, `user_quiz_attempts`, `user_exam_attempts`, `user_certificates`, `academy_settings`, `academy_destinations` | Avaliação e certificação |
| `news`, `news_likes`, `news_curation_feedback`, `noticias_brutas`, `noticias_dashboard` | Notícias do Trade |

### Comunidade

| Entidade | Finalidade |
|---|---|
| `community_rooms`, `community_messages`, `community_posts`, `community_post_comments`, `community_post_likes`, `community_members`, `community_highlights`, `community_votes` | Comunidade / Trade Connect |
| `direct_conversations`, `direct_messages` | Mensagens diretas |
| `connections` | Conexões entre agentes |
| `qa_questions`, `qa_answers`, `qa_answer_likes`, `qa_answer_votes` | Perguntas e respostas |

### Diretório turístico

| Entidade | Finalidade |
|---|---|
| `tour_operators`, `tour_guides`, `companhias_maritimas`, `companhias_maritimas_perfis`, `companhias_maritimas_regioes`, `regioes`, `cities`, `attractions`, `dining_places`, `experiences`, `shopping_places`, `events`, `agency_events`, `in_person_events`, `online_meetings`, `custom_event_types`, `preset_events`, `hidden_preset_events`, `highlighted_events` | Diretório e agenda do trade |
| `suppliers`, `supplier_contacts`, `supplier_reviews`, `supplier_likes`, `supplier_specialties`, `supplier_payments`, `supplier_review_moderation_log` | Fornecedores |
| `operator_reviews`, `operator_review_moderation_log` | Avaliações de operadoras |
| `cruise_reviews`, `cruise_review_moderation_log` | Avaliações de cruzeiros |
| `advisor_reviews`, `advisor_suggestions` | Travel Advisor |
| `trade_events`, `trade_suppliers`, `trade_updates`, `agenda_filter_preferences` | Trade |

### Benefícios, suporte, gamificação

| Entidade | Finalidade |
|---|---|
| `benefits`, `benefit_comments`, `benefit_confirmations` | Benefícios e descontos |
| `support_tickets`, `ticket_messages` | Suporte |
| `gamification_points`, `gamification_daily_login`, `gamification_daily_visits`, `gamification_mission_completions`, `achievement_definitions`, `user_achievements`, `monthly_prizes` | Gamificação |
| `feedback_settings`, `user_feedback` | Feedback mensal |
| `global_popups`, `monthly_popup_views`, `monthly_phrases`, `dashboard_banners`, `page_banners`, `platform_updates` | Comunicações globais |

### Integrações e infraestrutura

| Entidade | Finalidade |
|---|---|
| `google_calendar_sync`, `google_calendar_tokens` | Sincronização de agenda Google |
| `google_drive_tokens`, `drive_import_config`, `drive_import_logs` | Google Drive |
| `telegram_pending_chats`, `telegram_processed_updates`, `telegram_supplier_channels` | Telegram |
| `airfare_import_logs`, `full_package_imports`, `travel_requirements_consultations` | Importadores e consultas |
| `subscriptions` | Assinaturas Stripe |
| `registration_links` | Cadastro manual por link |
| `admin_resource_access_logs` | Auditoria de acesso a recursos |
| `agency_supplier_terms` | Termos comerciais agência↔fornecedor |
| `agency_membership` | Pertencimento de usuários a agência |

## Buckets de armazenamento (CONFIRMADOS por uso no código)

- `media-files` — biblioteca admin (MediaManager).
- `traveler-documents` — documentos de passageiros (privado).
- `ticket-attachments` — anexos de suporte (privado).
- Buckets dedicados a vouchers/PDFs (acessados via Edge Function).

## Edge Functions (visão por finalidade)

- **Conta/admin**: `admin-create-user`, `admin-delete-user`, `admin-toggle-user-status`, `admin-force-logout`, `admin-list-emails`, `admin-reset-password`, `admin-resolve-resource`, `admin-link-supplier-account`, `impersonate-user`, `register-via-link`, `validate-activation-token`.
- **Equipe**: `team-admin`, `team-login`, `team-resolve-login`, `team-session`, `team-audit`.
- **Cartão**: `create-business-card`, `card-og-image`, `activate-card-signup`.
- **Pagamentos**: `create-checkout`, `create-course-checkout`, `create-public-checkout`, `customer-portal`, `cancel-subscription`, `check-subscription`, `stripe-webhook`.
- **Vouchers/PDF**: `get-secure-voucher`, `serve-voucher`, `import-hotel-document`, `import-airfare-document`, `import-car-rental-document`, `import-generic-service-document`, `import-full-package`, `travel-import`.
- **IA**: `generate-content`, `generate-destination-intro`, `generate-itinerary`, `parse-itinerary-ai`, `refine-itinerary-activity`, `lead-wizard-ai`, `ai-import-service`, `extract-business-card`, `hotel-rx`, `curate-news`.
- **Integrações**: `google-calendar-auth/callback/sync`, `google-drive-auth/callback`, `drive-import-materials`, `cleanup-materials`, `places-autocomplete`, `hotel-autocomplete`, `hotel-photos`, `activity-photo`, `flight-lookup`, `flight-status`, `flight-status-monitor`, `telegram-setup`, `telegram-webhook`, `travelmeet-admin`, `check-travel-requirements`.
- **CRM/E-mail**: `send-crm-email`, `sync-users-to-crm`, `supplier-register`, `guide-register`.
- **Social/Open Graph**: `public-og`, `quote-og`.

## Funções e triggers de banco

- `has_role(uuid, app_role)` `SECURITY DEFINER` — checagem de papel sem recursão de RLS.
- `trg_sync_profile_to_crm` — sincroniza `profiles` para CRM administrativo.
- Triggers de cálculo de datas de recebimento, sincronização de `sale_amount`, geração automática de despesa de comissão de vendedor, atualização de `user_presence` — **CONFIRMADO** por memórias internas, detalhe específico em migrations.
# 02 — Inventário funcional

[← Índice](./00-LEIA-ME-E-INDICE.md)

> Coluna **Estado**: `CONFIRMADO` = rota e página existem no código; `INFERIDO` = rota existe, comportamento parcialmente deduzido. Coluna **Perfis com acesso** foi deduzida do uso de `ProtectedRoute`, `AdminRoute`, `FeatureGate` e do menu lateral; pode haver restrições adicionais por plano.

## Páginas autenticadas — App principal

| ID | Módulo | Submódulo | Tela / funcionalidade | Rota | Objetivo | Perfis com acesso | Estado | Evidência |
|---|---|---|---|---|---|---|---|---|
| 001 | Início | Dashboard | Dashboard principal | `/dashboard` | Hub do agente: próximos compromissos, KPIs, atalhos | Autenticado (plano Profissional/Premium) | CONFIRMADO | `src/pages/Dashboard.tsx` |
| 002 | Início | Dashboard Start | Dashboard Start | `/dashboard-start` | Hub simplificado para plano Start com upsell | Autenticado plano Start | CONFIRMADO | `src/pages/StartDashboard.tsx` |
| 003 | Início | Dashboard Fornecedor | Painel do fornecedor | `/dashboard-fornecedor` | Painel dedicado ao perfil Fornecedor | Perfil Fornecedor | CONFIRMADO | `src/pages/DashboardFornecedor.tsx` |
| 004 | Clientes | CRM | Funil de oportunidades (Kanban) | `/crm` | Visualização e movimentação de oportunidades | Autenticado | CONFIRMADO | `src/pages/CRM.tsx`, `src/components/crm/KanbanBoard.tsx` |
| 005 | Clientes | Gestão de Clientes | Dashboard/Clientes/Funil/Metas/Operações | `/gestao-clientes`, `/gestao-clientes/*` | Cadastro de clientes, funil resumido, metas e operações | Autenticado | CONFIRMADO | `src/pages/GestaoClientes.tsx` |
| 006 | Financeiro | Financeiro | Vendas, Entradas, Despesas, Faturas, Comissões, Vendedores, Dashboard | `/financeiro` | Gestão financeira completa via abas | Autenticado | CONFIRMADO | `src/pages/Financeiro.tsx`, `src/components/financial/*` |
| 007 | Criar | Carteira Digital | Editor + carteira pública | `/ferramentas-ia/trip-wallet`, `/ferramentas-ia/trip-wallet/:id` | Criação e edição de carteira digital de viagem | Autenticado | CONFIRMADO | `src/pages/TripWallet.tsx` |
| 008 | Criar | Orçamento | Editor de orçamento | `/ferramentas-ia/gerar-orcamento`, `/ferramentas-ia/gerar-orcamento/:id` | Criação e edição de orçamento | Autenticado | CONFIRMADO | `src/pages/GerarOrcamento.tsx` |
| 009 | Criar | Roteiro | Editor de roteiro | `/ferramentas-ia/criar-roteiro`, `/ferramentas-ia/criar-roteiro/:id` | Criação e edição de roteiros | Autenticado | CONFIRMADO | `src/pages/CriarRoteiro.tsx` |
| 010 | Criar | Modelos de Roteiro | Galeria de modelos | `/ferramentas-ia/modelos-roteiros` | Modelos para clonar | Autenticado | CONFIRMADO | `src/pages/ModelosRoteiros.tsx` |
| 011 | Criar | Bloco de Notas | Notas pessoais | `/bloco-notas` | Anotações com templates | Autenticado | CONFIRMADO | `src/pages/BlocoNotas.tsx` |
| 012 | Criar | Conteúdo | Gerador de conteúdo IA | `/ferramentas-ia/criar-conteudo` | Geração de textos e materiais com IA | Autenticado | CONFIRMADO | `src/pages/CriarConteudo.tsx` |
| 013 | Marketing | Vitrine de Ofertas | Editor da vitrine | `/minha-vitrine` | Curadoria e publicação da vitrine pública | Autenticado | CONFIRMADO | `src/pages/MinhaVitrine.tsx` |
| 014 | Marketing | Cartão de Visitas | Editor do cartão | `/meu-cartao`, `/meu-cartao/:id` | Cartão digital com QR | Autenticado | CONFIRMADO | `src/pages/MeuCartao.tsx`, `MeuCartaoEditor.tsx` |
| 015 | Marketing | Criar Cartão | Wizard inicial | `/criar-cartao` | Onboarding do cartão | Autenticado | CONFIRMADO | `src/pages/CriarCartao.tsx` |
| 016 | Marketing | Lâminas | Personalizador de lâminas | `/personalizador-laminas` | Criação de imagens promocionais | Autenticado | CONFIRMADO | `src/pages/PersonalizadorLaminas.tsx` |
| 017 | Marketing | Captação de Leads (Hub) | Hub e formulários conversacionais | `/meus-leads`, `/meus-leads/conversacional` | Gestão e criação de captações | Autenticado | CONFIRMADO | `src/pages/CaptacaoLeads.tsx`, `MeusLeads.tsx` |
| 018 | Marketing | Sales Landings | Lista, novo, editar | `/meus-leads/landings`, `/nova`, `/:id/editar` | Landings de vendas com leads | Autenticado | CONFIRMADO | `src/pages/SalesLandings.tsx`, `SalesLandingEditor.tsx` |
| 019 | Recursos Vendas | Bloqueios Aéreos | Busca de bloqueios | `/bloqueios-aereos` | Pesquisa de bloqueios de assentos | Autenticado | CONFIRMADO | `src/pages/BloqueiosAereos.tsx` |
| 020 | Recursos Vendas | Materiais | Biblioteca de materiais | `/materiais` | Acesso a materiais de divulgação | Autenticado | CONFIRMADO | `src/pages/Materiais.tsx` |
| 021 | Guias | Mapa do Turismo | Diretório de fornecedores | `/mapa-turismo` + subrotas | Diretório taxonômico (operadoras, cruzeiros, guias, atrativos) | Autenticado | CONFIRMADO | `src/pages/MapaTurismo.tsx`, `CruisesPage.tsx`, `SupplierDetail.tsx`, `OperadoraDetail.tsx`, `GuideDetail.tsx` |
| 022 | Guias | Benefícios | Catálogo de benefícios | `/beneficios` | Cupons e parcerias | Autenticado | CONFIRMADO | `src/pages/Beneficios.tsx` |
| 023 | Guias | Requisitos de Viagem | Consulta de requisitos | `/requisitos-viagem` | Vistos, vacinas e documentos | Autenticado | CONFIRMADO | `src/pages/RequisitosViagem.tsx` |
| 024 | Guias | Raio-X do Hotel | Análise estratégica de hotel | `/hotel-raio-x` | Análise com Google Places + IA | Autenticado | CONFIRMADO | `src/pages/HotelRaioX.tsx` |
| 025 | Guias | Travel Advisor | Hotéis, Restaurantes, Compras, Experiências, Atrações | `/dream-advisor` (entrada) | Recomendações curadas | Autenticado | CONFIRMADO | `src/pages/DreamAdvisor.tsx`, `HotelAdvisor.tsx`, `DiningAdvisor.tsx`, `ShoppingAdvisor.tsx`, `ExperienceAdvisor.tsx`, `AttractionAdvisor.tsx` |
| 026 | Conhecimento | EducaTravel Academy | Trilhas de aulas | `/educa-academy` | Vídeos e trilhas de capacitação | Autenticado | CONFIRMADO | `src/pages/EducaAcademy.tsx` |
| 027 | Conhecimento | Cursos | Marketplace de cursos | `/cursos`, `/cursos/:id`, `/cursos/:id/editar` | Marketplace + editor de cursos | Autenticado | CONFIRMADO | `src/pages/CursosMarketplace.tsx`, `CursoDetalhe.tsx`, `CursoEditar.tsx` |
| 028 | Conhecimento | Mentorias | Lista e detalhe | `/mentorias`, `/mentorias/:id` | Mentorias agendáveis | Autenticado | CONFIRMADO | `src/pages/Mentorias.tsx`, `MentoriaDetail.tsx` |
| 029 | Conhecimento | Notícias do Trade | Feed de notícias | `/noticias` | Radar do turismo | Autenticado | CONFIRMADO | `src/pages/Noticias.tsx` |
| 030 | Comunidade | Comunidade — Hub | Hub principal | `/comunidade` | Feed social + acesso a sub-áreas | Autenticado | CONFIRMADO | `src/pages/TradeConnectHub.tsx` |
| 031 | Comunidade | Chat | Chat da comunidade | `/comunidade/chat` | Conversas em salas | Autenticado | CONFIRMADO | `src/pages/Community.tsx` |
| 032 | Comunidade | Perfil público de agente | Perfil | `/comunidade/perfil`, `/comunidade/agente/:userId` | Perfis e conexões | Autenticado | CONFIRMADO | `src/pages/TradeConnectProfile.tsx`, `AgentProfile.tsx` |
| 033 | Comunidade | Comunidades temáticas | Lista | `/comunidade/comunidades` | Grupos temáticos | Autenticado | CONFIRMADO | `src/pages/TradeConnectCommunities.tsx` |
| 034 | Comunidade | Perguntas e Respostas | Q&A | `/perguntas-respostas` | Tira-dúvidas social | Autenticado | CONFIRMADO | `src/pages/PerguntasRespostas.tsx` |
| 035 | Ferramentas | Ferramentas de IA | Hub | `/ferramentas-ia` | Atalhos para IAs | Autenticado | CONFIRMADO | `src/pages/FerramentasIA.tsx` |
| 036 | Ferramentas | Meus Projetos | Hub de projetos | `/meus-projetos` | Orçamentos, roteiros, carteiras unificados | Autenticado | CONFIRMADO | `src/pages/MeusProjetos.tsx` |
| 037 | Ferramentas | Sorteador | Sorteio para a equipe | `/sorteador` | Sorteios internos | Autenticado | CONFIRMADO | `src/pages/Sorteador.tsx` |
| 038 | Ferramentas | Agenda | Agenda + Google Calendar | `/agenda` | Agenda integrada | Autenticado | CONFIRMADO | `src/pages/Agenda.tsx` |
| 039 | Ferramentas | Calculadora | Calculadora de margem/câmbio | `/calculadora` | Cálculos comerciais | Autenticado | CONFIRMADO | `src/pages/Calculadora.tsx` |
| 040 | Trade | Agenda Trade | Eventos do trade | `/agenda-trade` | Calendário de eventos do setor | Autenticado | CONFIRMADO | `src/pages/AgendaTrade.tsx` |
| 041 | Conta | Perfil | Perfil pessoal | `/perfil` | Dados básicos do usuário | Autenticado | CONFIRMADO | `src/pages/Perfil.tsx` |
| 042 | Conta | Minha Conta | Conta, equipe, integrações | `/minha-conta` | Conta da agência | Autenticado | CONFIRMADO | `src/pages/MinhaConta.tsx` |
| 043 | Conta | Onboarding | Setup inicial | `/onboarding` | Wizard obrigatório pós-cadastro | Autenticado | CONFIRMADO | `src/pages/Onboarding.tsx` |
| 044 | Conta | Atualizações | Changelog interno | `/atualizacoes` | Novidades da plataforma | Autenticado | CONFIRMADO | `src/pages/Atualizacoes.tsx` |
| 045 | Conta | Gamificação | Pontos e ranking | `/gamificacao` | Mecânica de pontos | Autenticado | CONFIRMADO | `src/pages/Gamificacao.tsx` |
| 046 | Marketing | Campanha de Indicação | Programa AGENTES30 | `/campanha-indicacao` | Indicações com bônus | Autenticado | CONFIRMADO | `src/pages/CampanhaIndicacao.tsx` |
| 047 | Conta | Suporte | Tickets | `/suporte` | Atendimento em chat | Autenticado | CONFIRMADO | `src/pages/Suporte.tsx` |
| 048 | Conta | Planos | Página de planos | `/planos` | Comparativo + checkout | Público + autenticado | CONFIRMADO | `src/pages/Planos.tsx` |
| 049 | Fornecedor | Perfil do fornecedor | Edição do próprio cadastro | `/meu-perfil-empresa` | Auto-serviço do fornecedor | Perfil Fornecedor | CONFIRMADO | `src/pages/SupplierProfileEdit.tsx` |
| 050 | Admin | Admin | Painel admin | `/admin` | Gestão da plataforma | Admin | CONFIRMADO | `src/pages/Admin.tsx`, `AdminRoute.tsx` |
| 051 | Admin | Admin CRM | CRM administrativo | `/admin/crm` | Gestão de leads/usuários | Admin | CONFIRMADO | `src/pages/AdminCRM.tsx` |

## Páginas públicas

| ID | Tela | Rota | Objetivo | Estado | Evidência |
|---|---|---|---|---|---|
| P01 | Landing principal | `/` (hostname app) | Apresentação | CONFIRMADO | `src/pages/LandingPage.tsx` |
| P02 | Blog | `/blog` | Conteúdo público | CONFIRMADO | `src/pages/Blog.tsx` |
| P03 | Planos | `/planos` | Apresentação dos planos | CONFIRMADO | `src/pages/Planos.tsx` |
| P04 | Desconto 30 Off | `/desconto30off` | Página promocional | CONFIRMADO | `src/pages/Desconto30Off.tsx` |
| P05 | Cadastro Fornecedor | `/cadastro-fornecedor` | Onboarding de fornecedores | CONFIRMADO | `src/pages/CadastroFornecedor.tsx` |
| P06 | Cadastro Guia | `/cadastro-guia` | Onboarding de guias | CONFIRMADO | `src/pages/CadastroGuia.tsx` |
| P07 | Carteira pública (legacy) | `/c/:slug` | Carteira por slug | CONFIRMADO | `src/pages/CarteiraPublica.tsx` |
| P08 | Carteira pública V2 | resolvida pelo `PublicCodeResolver` por hostname | Versão atual | CONFIRMADO | `src/pages/CarteiraPublicaV2.tsx`, `src/components/routing/PublicCodeResolver.tsx` |
| P09 | Viagem pública | `/viagem/:token` | Visualização compartilhada de viagem | CONFIRMADO | `src/pages/ViagemPublica.tsx` |
| P10 | Shortcode | `/v/:code` | Redirect curto | CONFIRMADO | `src/pages/ShortCodeRedirect.tsx` |
| P11 | Roteiro público | `/roteiro/:token` | Roteiro compartilhado | CONFIRMADO | `src/pages/RoteiroPublico.tsx` |
| P12 | Orçamento público | `/orcamento/:token` | Proposta compartilhada | CONFIRMADO | `src/pages/OrcamentoPublico.tsx` |
| P13 | Fatura pública | `/fatura/:agencySlug/:code` | Fatura para o cliente | CONFIRMADO | `src/pages/FaturaPublica.tsx` |
| P14 | Cadastro via link | `/cadastro/:token` | Cadastro manual via link assinado | CONFIRMADO | `src/pages/CadastroLink.tsx` |
| P15 | Formulário público de lead | `/formulario/:token` | Captação | CONFIRMADO | `src/pages/LeadFormPublic.tsx` |
| P16 | Pesquisa | `/pesquisa/:slug` | Pesquisa de satisfação | CONFIRMADO | `src/pages/Pesquisa.tsx` |
| P17 | Ativar cartão | `/ativar-cartao` ou hostname dedicado | Ativação de cartão impresso | CONFIRMADO | `src/pages/AtivarCartao.tsx` |
| P18 | Captura de cartão | `/captura-cartao/:token` | OCR de cartão de visitas em evento | CONFIRMADO | `src/pages/CardCaptureQuickAccess.tsx` |
| P19 | Cartão público | resolvido por `SlugResolver` | Cartão de visitas público | CONFIRMADO | `src/pages/CartaoPublico.tsx` |
| P20 | Vitrine pública | resolvido por `SlugResolver` | Vitrine de ofertas pública | CONFIRMADO | `src/pages/VitrinePublica.tsx` |
| P21 | Sales Landing pública | `/lp/:slug` ou hostname `lp.*` | Landing de vendas | CONFIRMADO | `src/pages/SalesLandingPublic.tsx` |
| P22 | Reset Password | `/reset-password` | Reset de senha | CONFIRMADO | `src/pages/ResetPassword.tsx` |
| P23 | Auth | `/auth` | Login/cadastro | CONFIRMADO | `src/pages/Auth.tsx` |
| P24 | Políticas de Privacidade | `/politicasdeprivacidade` | Política | CONFIRMADO | `src/pages/PoliticasPrivacidade.tsx` |
| P25 | Termos de Uso | `/termosdeuso` | Termos | CONFIRMADO | `src/pages/TermosDeUso.tsx` |
| P26 | NotFound | `*` | Erro 404 | CONFIRMADO | `src/pages/NotFound.tsx` |

## Hubs internos do menu

`src/config/menuConfig.ts` define a seguinte taxonomia (CONFIRMADA):

- **Início**
- **Conhecimento**: EducaTravel Academy · Cursos e Mentorias · Notícias do Trade
- **Guias e Referências**: Mapa do Turismo · Benefícios e Descontos · Central de Requisitos · Raio-X do Hotel · Travel Advisor
- **Recursos de Vendas**: Bloqueios Aéreos · Materiais de Divulgação
- **Criar**: Carteira Digital · Orçamento · Roteiros · Bloco de Notas
- **Clientes**: Dashboard · Gestão de Clientes · Oportunidades · Operações · Meta de Vendas
- **Financeiro**: Vendas · Entradas · Despesas · Faturas · Comissões · Vendedores · Dashboard
- **Ferramentas de Marketing**: Cartão de Visitas · Vitrine de Ofertas · Personalizador de Lâminas · Captação de Leads · Conteúdo

A ordem é configurável por usuário via `useMenuOrder` / `useFullMenuOrder`.

## Funcionalidades transversais

- Impersonação administrativa (`impersonate-user`, `admin-resolve-resource`) — **CONFIRMADO**.
- Convites de equipe via Edge Function `team-admin`, login dedicado em `team-login`/`team-session` — **CONFIRMADO**.
- Timeout de sessão de 20 min (`useSessionTimeout`) — **CONFIRMADO**.
- Acompanhamento de presença e analytics de uso (`user_presence`, `user_sessions`) — **CONFIRMADO**.
- Popups globais com regra de uma vez por mês (`global_popups`, `monthly_popup_views`) — **CONFIRMADO**.
- Feedback obrigatório mensal (`feedback_settings`, `user_feedback`) — **CONFIRMADO**.
- Gamificação com pontos, missões e ranking (`gamification_*`) — **CONFIRMADO**.
- Tickets de suporte em tempo real (`support_tickets`, `ticket_messages`, bucket `ticket-attachments`) — **CONFIRMADO**.
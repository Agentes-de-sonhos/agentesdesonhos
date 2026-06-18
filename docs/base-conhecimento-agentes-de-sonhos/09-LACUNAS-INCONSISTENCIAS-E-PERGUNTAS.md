# 09 — Lacunas, inconsistências e perguntas

[← Índice](./00-LEIA-ME-E-INDICE.md)

## Achados classificados (sem implementação de correção)

| # | Severidade | Achado | Evidência | Recomendação |
|---|---|---|---|---|
| 1 | Alto | Existem **duas versões** da Carteira Pública (`CarteiraPublica.tsx` e `CarteiraPublicaV2.tsx`) coexistindo, roteadas por hostname. Pode causar divergência de comportamento. | `src/App.tsx`, `PublicCodeResolver.tsx` | Documentar oficialmente V2 e plano de descomissionamento da V1. |
| 2 | Alto | Existem **duas versões** de Orçamento Público (`OrcamentoPublico.tsx` e `OrcamentoPublicoV2.tsx`). | `src/pages/*` | Idem acima. |
| 3 | Alto | Existem **duas versões** de Roteiro Público (`RoteiroPublico.tsx` e `RoteiroPublicoV2.tsx`). | `src/pages/*` | Idem. |
| 4 | Médio | `Onboarding` é referenciado como obrigatório, mas a rota `/onboarding` é acessível à parte; não foi auditado se há redirect efetivo. | `src/App.tsx` | Confirmar fluxo obrigatório no `ProtectedRoute`. |
| 5 | Médio | Página `DreamAdvisor` é o ponto de entrada do Travel Advisor, mas as páginas `Hotel/Dining/Shopping/Experience/AttractionAdvisor` não aparecem como rotas raiz no `App.tsx`. | `src/App.tsx`, `src/pages/*Advisor.tsx` | Confirmar como o usuário chega às páginas específicas. |
| 6 | Médio | Permissões de equipe têm UI/RLS mistas. **PENDENTE DE CONFIRMAÇÃO** se algum módulo bloqueia apenas no frontend. | `agency_team_permissions`, `user_feature_access` | Auditoria dedicada de RLS por módulo. |
| 7 | Médio | A passagem **oportunidade → venda** parece manual. Confirmar se há automação esperada. | `opportunities`, `sales` | Decidir produto: automatizar ou manter manual. |
| 8 | Baixo | Há rotas `/trade-connect` legadas com redirect para `/comunidade`. Manter pelo menos por alguns ciclos para SEO. | `src/App.tsx` | Manter até confirmar zero tráfego. |
| 9 | Baixo | Tabela `booking_*` parece um modelo alternativo paralelo a `sales/sale_products`. Não está claro qual é oficial. | Lista de tabelas | Definir SOT (Source of Truth). |
| 10 | Baixo | Existem duas tabelas de comentários (`benefit_comments`, `marketplace_comments`, etc.) com padrões parecidos — oportunidade de uniformização. | Lista de tabelas | Não bloqueia uso. |
| 11 | Baixo | `noticias_brutas` × `news` × `noticias_dashboard` — pipeline em três níveis, sem documentação visível dos contratos. | Lista de tabelas | Documentar ETL. |
| 12 | Baixo | Página `CertificateTest` em produção (`/certificate-test`) parece de testes. | `src/App.tsx` | Ocultar ou mover para admin. |
| 13 | Baixo | `Sorteador` está acessível a qualquer usuário autenticado — confirmar se é intencional. | `src/App.tsx` | Validar permissão. |
| 14 | Oportunidade | Não há descrição consolidada do que acontece ao excluir um cliente com vendas e operações relacionadas. | Memória parcial | Documentar cascade rules. |
| 15 | Oportunidade | Vários hubs públicos vivem em subdomínios distintos sem padrão único de tema/SEO. | Lista de domínios | Padronizar metatags e favicons. |

## Perguntas prioritárias para o proprietário do produto

### Prioridade 1 — bloqueiam documentação correta

1. Qual é a **versão oficial** de Carteira Pública, Orçamento Público e Roteiro Público? As versões antigas continuam ativas para clientes existentes ou já podem ser descontinuadas?
2. Quando uma oportunidade é movida para a etapa “Ganha/Fechada”, o sistema **deve** criar automaticamente uma venda no Financeiro? Hoje aparenta ser manual.
3. Qual é o **fluxo oficial** entre Orçamento aprovado → Venda → Operação → Carteira/Roteiro? Quais passos são automáticos e quais manuais?

### Prioridade 2 — regras comerciais não explícitas

4. Em multi-moeda, como o sistema deve tratar conversões posteriores quando a cotação muda? O modo “Fixo” mantém o valor original mesmo após meses?
5. Qual a regra exata de cálculo de data de recebimento por modalidade de pagamento (à vista, parcelado, link de pagamento)?
6. Comissões de vendedor: sempre viram despesa? Existe cenário em que não deveriam virar?

### Prioridade 3 — comportamentos ambíguos

7. A página **Sorteador** é para a equipe da agência ou para a Lovable? Quem deve ter acesso?
8. **Dream Advisor** vs páginas específicas (HotelAdvisor, DiningAdvisor etc.) — qual é o ponto de entrada oficial e por que as páginas específicas não estão roteadas em `App.tsx`?
9. Trade Connect virou **Comunidade**. Rotas antigas podem ser removidas?

### Prioridade 4 — funcionalidades aparentemente incompletas

10. Tabelas `booking_*` (bookings, booking_services, booking_payments, booking_commissions, booking_documents) — estão em uso? São o caminho futuro ou legacy?
11. Página `CertificateTest` — é teste e deveria ser removida da produção?

### Prioridade 5 — decisões de nomenclatura

12. Termo oficial para “cliente que viajou” — usamos cliente, passageiro, viajante? Devemos padronizar no produto?
13. “Notícias do Trade” vs “Radar do Turismo” — qual é o nome oficial exibido?
14. “EducaTravel Academy” vs “Academy” vs “Educa” — qual nome usar em comunicações?

### Prioridade 6 — permissões

15. Quais permissões de equipe são **estritamente reforçadas em RLS** (backend) e quais são apenas controle de UI?
16. Membros de equipe podem compartilhar links públicos (carteira, orçamento) sem aprovação do titular?

### Prioridade 7 — processos manuais externos

17. Importação de PDFs (hotéis, aéreos, pacotes) — quem revisa o resultado da IA antes de publicar? Existe fluxo de aprovação?
18. Curadoria de notícias — quem revisa o feed antes de exibir aos agentes?
19. Cadastro de fornecedores via `/cadastro-fornecedor` — passa por moderação admin antes de ir ao Mapa do Turismo?
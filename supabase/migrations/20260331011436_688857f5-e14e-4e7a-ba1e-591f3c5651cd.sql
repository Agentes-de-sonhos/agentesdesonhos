
-- Remove old menu order data (old "vender" section)
DELETE FROM public.menu_order;

-- Seed with current full menu structure
INSERT INTO public.menu_order (section, item_key, order_index) VALUES
-- Main menu ordering (top-level sections and standalone items)
('main', 'inicio', 0),
('main', 'section_conhecimento', 1),
('main', 'section_guias', 2),
('main', 'section_recursos_vendas', 3),
('main', 'section_criar', 4),
('main', 'meus_projetos', 5),
('main', 'section_clientes', 6),
('main', 'section_financeiro', 7),
('main', 'section_marketing', 8),
('main', 'comunidade', 9),
('main', 'cursos_mentorias', 10),
-- Conhecimento sub-items
('conhecimento', 'educa_academy', 0),
('conhecimento', 'noticias', 1),
-- Guias e Referências sub-items
('guias', 'mapa_turismo', 0),
('guias', 'travel_advisor', 1),
('guias', 'beneficios', 2),
('guias', 'agenda', 3),
-- Recursos de Vendas sub-items
('recursos_vendas', 'bloqueios_aereos', 0),
('recursos_vendas', 'materiais', 1),
('recursos_vendas', 'hotel_raio_x', 2),
-- Criar sub-items
('criar', 'carteira_digital', 0),
('criar', 'orcamento', 1),
('criar', 'roteiros', 2),
('criar', 'conteudo', 3),
-- Clientes sub-items
('clientes', 'gestao_clientes', 0),
('clientes', 'oportunidades', 1),
('clientes', 'meta_vendas', 2),
-- Financeiro sub-items
('financeiro', 'vendas_fin', 0),
('financeiro', 'entradas', 1),
('financeiro', 'despesas', 2),
('financeiro', 'dashboard_fin', 3),
-- Marketing sub-items
('marketing', 'cartao_visitas', 0),
('marketing', 'vitrine_ofertas', 1),
('marketing', 'personalizador_laminas', 2),
('marketing', 'captacao_leads', 3);

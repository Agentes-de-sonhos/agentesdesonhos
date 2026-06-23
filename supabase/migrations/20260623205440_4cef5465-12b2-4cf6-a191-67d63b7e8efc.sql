-- Reordena as seções do menu principal mantendo a divisória atual.
-- Grupo 1 (antes da divisória) permanece inalterado no código: Meus Projetos, Minha Agenda, Meu Perfil, Comunidade.
-- Grupo 2 (após a divisória) é reorganizado para:
--   1. Criar
--   2. Conhecimento
--   3. Gestão de Clientes
--   4. Gestão Financeira
--   5. Ferramentas de Marketing
--   6. Guias e Referências
-- Recursos de Vendas é mantido visível ao final do grupo 2 (sem alteração de visibilidade).

UPDATE public.menu_order SET order_index = 0, updated_at = now() WHERE section = 'main' AND item_key = 'section_criar';
UPDATE public.menu_order SET order_index = 1, updated_at = now() WHERE section = 'main' AND item_key = 'section_conhecimento';
UPDATE public.menu_order SET order_index = 2, updated_at = now() WHERE section = 'main' AND item_key = 'section_clientes';
UPDATE public.menu_order SET order_index = 3, updated_at = now() WHERE section = 'main' AND item_key = 'section_financeiro';
UPDATE public.menu_order SET order_index = 4, updated_at = now() WHERE section = 'main' AND item_key = 'section_marketing';
UPDATE public.menu_order SET order_index = 5, updated_at = now() WHERE section = 'main' AND item_key = 'section_guias';
UPDATE public.menu_order SET order_index = 6, updated_at = now() WHERE section = 'main' AND item_key = 'section_recursos_vendas';

-- Itens estáticos (não fazem parte do grupo dinâmico após a divisória) mantidos em índices altos para não interferir.
UPDATE public.menu_order SET order_index = 100, updated_at = now() WHERE section = 'main' AND item_key = 'inicio';
UPDATE public.menu_order SET order_index = 101, updated_at = now() WHERE section = 'main' AND item_key = 'meus_projetos';
UPDATE public.menu_order SET order_index = 102, updated_at = now() WHERE section = 'main' AND item_key = 'comunidade';
UPDATE public.menu_order SET order_index = 103, updated_at = now() WHERE section = 'main' AND item_key = 'cursos_mentorias';
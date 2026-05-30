UPDATE public.menu_order SET order_index = 1, updated_at = now() WHERE section = 'clientes' AND item_key = 'gestao_clientes';
UPDATE public.menu_order SET order_index = 2, updated_at = now() WHERE section = 'clientes' AND item_key = 'oportunidades';
UPDATE public.menu_order SET order_index = 4, updated_at = now() WHERE section = 'clientes' AND item_key = 'meta_vendas';

INSERT INTO public.menu_order (section, item_key, order_index)
VALUES
  ('clientes', 'dashboard_clientes', 0),
  ('clientes', 'operacoes', 3)
ON CONFLICT (section, item_key) DO UPDATE SET order_index = EXCLUDED.order_index, updated_at = now();

DO $$
DECLARE
  v_quote_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.quotes (id, user_id, client_name, adults_count, children_count, destination, start_date, end_date, total_amount, status, share_token)
  VALUES (v_quote_id, '82533e84-789f-4080-9a5d-537135516d46', 'Juliana Martins', 2, 2, 'Orlando, FL', '2026-07-10', '2026-07-20', 48850.00, 'published', 'demo-orlando-juliana-2026');

  INSERT INTO public.quote_services (quote_id, service_type, service_data, amount, order_index) VALUES
  (v_quote_id, 'flight', '{"origin_city":"São Paulo (GRU)","destination_city":"Orlando (MCO)","airline":"LATAM Airlines","departure_date":"2026-07-10","return_date":"2026-07-20","includes_baggage":true,"includes_boarding_fee":true,"notes":"Voo direto GRU → MCO. Ida às 08h30, chegada às 16h45 (horário local). Volta às 20h10, chegada às 07h25+1. Classe Econômica Premium com assento extra e refeição inclusa.","adult_price":4200,"child_price":3800}', 16000.00, 0),
  (v_quote_id, 'hotel', '{"hotel_name":"Hyatt Regency Grand Cypress","city":"Orlando, FL","check_in":"2026-07-10","check_out":"2026-07-20","room_type":"Suite Familiar com 2 quartos","meal_plan":"Café da manhã incluso","notes":"Resort 4 estrelas a 5 min dos parques Disney. Piscina com lago, campo de golfe e transporte cortesia para os parques. Vista para o jardim tropical."}', 12500.00, 1),
  (v_quote_id, 'car_rental', '{"car_type":"SUV Intermediário (tipo Jeep Cherokee ou similar)","days":10,"pickup_location":"Aeroporto MCO – Orlando","dropoff_location":"Aeroporto MCO – Orlando","notes":"Seguro completo (CDW + LIS) incluso. GPS integrado. Cadeirinha infantil inclusa sem custo adicional."}', 3200.00, 2),
  (v_quote_id, 'transfer', '{"transfer_type":"arrival","location":"Aeroporto MCO → Hyatt Regency Grand Cypress","date":"2026-07-10","price":350}', 350.00, 3),
  (v_quote_id, 'transfer', '{"transfer_type":"departure","location":"Hyatt Regency Grand Cypress → Aeroporto MCO","date":"2026-07-20","price":350}', 350.00, 4),
  (v_quote_id, 'attraction', '{"name":"Combo Disney World 4 Parques (5 dias) — Magic Kingdom, Epcot, Hollywood Studios e Animal Kingdom. Inclui Park Hopper para visitar múltiplos parques no mesmo dia.","date":"2026-07-11","quantity":4}', 5600.00, 5),
  (v_quote_id, 'attraction', '{"name":"Universal Orlando Resort 3 Parques (2 dias) — Universal Studios, Islands of Adventure e Volcano Bay. Inclui Express Pass para filas reduzidas.","date":"2026-07-16","quantity":4}', 3200.00, 6),
  (v_quote_id, 'insurance', '{"provider":"Assist Card","start_date":"2026-07-10","end_date":"2026-07-20","coverage":"Cobertura de USD 150.000 — Despesas médicas, odontológicas, extravio de bagagem, cancelamento de viagem e assistência 24h em português.","price":1250}', 1250.00, 7),
  (v_quote_id, 'cruise', '{"ship_name":"Disney Wish","route":"Port Canaveral → Nassau → Castaway Cay → Port Canaveral","start_date":"2026-07-17","end_date":"2026-07-19","cabin_type":"Cabine com Varanda — Deck 8, vista para o mar. Inclui todas as refeições, shows e acesso ao Aqua Mouse.","price":4800}', 4800.00, 8),
  (v_quote_id, 'other', '{"description":"✨ Experiência VIP: Jantar especial no California Grill (Contemporary Resort) com vista para os fogos do Magic Kingdom + City Tour guiado por International Drive com paradas em outlets premium. Guia brasileiro acompanhando a família durante todo o passeio.","price":1600}', 1600.00, 9);
END $$;

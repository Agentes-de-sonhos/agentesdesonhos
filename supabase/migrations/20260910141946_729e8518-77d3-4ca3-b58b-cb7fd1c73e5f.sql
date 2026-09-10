CREATE OR REPLACE FUNCTION private.reservations_project(
  _data jsonb, _revenue boolean, _margin boolean, _commission boolean)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_out jsonb;
  v_key text;
  v_val jsonb;
  v_allowed text[];
  v_containers CONSTANT text[] := ARRAY[
    'snapshot','service_data','flight_data','hotel_data','activity_data','transfer_data',
    'imported_summary','passengers_snapshot','contact_snapshot','payload','changes',
    'contact','client','company','traveler','travelers','passenger','room','rooms_detail',
    'options','option','request','service','details_data','extra','meta','data'
  ];
  v_operational CONSTANT text[] := ARRAY[
    'id','service_id','file_id','agency_id','item_id','request_item_id','index','order','sort',
    'type','service_type','category','subcategory','kind','origin','source','provider',
    'status','stage','is_required','selected','confirmed','locale','language','timezone',
    'created_at','updated_at','event_type','actor_name','actor_type','label','reason','from','to',
    'name','full_name','title','product_name','description','summary','details','observations',
    'notes','note','internal_notes','instructions','remarks','terms','payment_terms_text',
    'inclusions','exclusions','includes','excludes','cancellation_policy','policy','deadline',
    'confirmation_code','locator','record_locator','reservation_code','voucher','voucher_code',
    'supplier_id','supplier_name','operator','operator_name','operator_id','airline','airline_name',
    'city','country','state','destination','destination_city','origin_city','address','region',
    'start_date','end_date','date','check_in','check_out','checkin','checkout','leg_date',
    'departure','arrival','departure_time','arrival_time','departure_date','arrival_date',
    'time','duration','nights','days','due_date',
    'quantity','qty','passengers','passengers_count','pax','adults','children','infants',
    'adults_count','children_count','infants_count','rooms','rooms_count','room_type','room_name',
    'board','board_type','meal_plan','regime','age','birth_date','document','document_number',
    'passport','nationality','gender','email','phone','whatsapp',
    'flight_number','flight','segments','legs','stops','cabin','class','baggage','seat','terminal',
    'hotel_name','hotel','category_stars','stars','transfer_type','vehicle','pickup','dropoff',
    'itinerary','items','services','activities','schedule','checklist',
    'currency','currency_code','pricing_mode','payment_status','notes_changed','snapshot_changed',
    'contact_changed','contractor_changed','requested_amount_changed','currency_changed'
  ];
  v_revenue_keys CONSTANT text[] := ARRAY[
    'requested_amount','reconfirmed_amount','sold_amount','final_sale_amount','sale_amount',
    'total_amount','amount','unit_amount','price','unit_price','total_price','adult_price',
    'child_price','infant_price','fees_amount','taxes_amount','tax','fees','subtotal',
    'total_estimated','items_sum','total_original','total_brl','total','discount','discount_amount',
    'payment_amount','installment_amount','installments_value','deposit_amount','balance_amount',
    'sold_from','sold_to','reconfirmed_from','reconfirmed_to','requested_from','requested_to',
    'amount_from','amount_to','total_from','total_to','exchange_rate','rate'
  ];
  v_margin_keys CONSTANT text[] := ARRAY[
    'cost_amount','cost','net_amount','net_price','supplier_cost','margin','margin_amount',
    'markup','markup_amount','cost_from','cost_to','margin_from','margin_to'
  ];
  v_commission_keys CONSTANT text[] := ARRAY[
    'commission_amount','commission','commission_percent','commission_rate','commission_value',
    'commission_from','commission_to'
  ];
BEGIN
  IF _data IS NULL THEN RETURN NULL; END IF;
  IF _revenue AND _margin AND _commission THEN RETURN _data; END IF;

  v_allowed := v_operational || v_containers;
  IF _revenue THEN v_allowed := v_allowed || v_revenue_keys; END IF;
  IF _margin THEN v_allowed := v_allowed || v_margin_keys; END IF;
  IF _commission THEN v_allowed := v_allowed || v_commission_keys; END IF;

  IF jsonb_typeof(_data) = 'object' THEN
    v_out := '{}'::jsonb;
    FOR v_key, v_val IN SELECT * FROM jsonb_each(_data) LOOP
      CONTINUE WHEN NOT (lower(v_key) = ANY(v_allowed));
      -- contêineres só sobrevivem como estrutura: escalares desconhecidos são descartados.
      CONTINUE WHEN lower(v_key) = ANY(v_containers)
                AND NOT (lower(v_key) = ANY(v_operational))
                AND jsonb_typeof(v_val) NOT IN ('object','array');
      v_out := v_out || jsonb_build_object(
        v_key,
        CASE WHEN jsonb_typeof(v_val) IN ('object','array')
             THEN private.reservations_project(v_val, _revenue, _margin, _commission)
             ELSE v_val END);
    END LOOP;
    RETURN v_out;
  ELSIF jsonb_typeof(_data) = 'array' THEN
    SELECT COALESCE(jsonb_agg(private.reservations_project(el, _revenue, _margin, _commission)), '[]'::jsonb)
      INTO v_out FROM jsonb_array_elements(_data) el;
    RETURN v_out;
  END IF;
  RETURN _data;
END $$;

REVOKE ALL ON FUNCTION private.reservations_project(jsonb, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reservations_project(jsonb, boolean, boolean, boolean) TO authenticated, service_role;
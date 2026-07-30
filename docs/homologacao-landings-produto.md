# Homologação de landings de produto (modelos prontos)

Objetivo: testar formulário, CRM e notificações **sem** gerar métricas comerciais falsas
para a agência.

## Como funciona
- `agency_product_landings.test_mode_until` (timestamptz) define uma janela de homologação.
- Enquanto `test_mode_until > now()`, as RPCs públicas `track_product_landing_view` e
  `submit_product_landing_lead` gravam os registros com `is_test = true`.
- Registros `is_test = true` **não** incrementam `views_count` / `leads_count`.
- A marcação vem apenas do estado do servidor. Parâmetros de URL, campos ocultos ou payload
  do navegador **não** conseguem forçar `is_test`.
- A janela expira sozinha (máximo 240 minutos), evitando que o modo fique ligado por engano.

## Iniciar / encerrar (somente administradores)
```sql
select set_product_landing_test_mode('<landing_id>', 60);  -- inicia (60 min)
select set_product_landing_test_mode('<landing_id>', 0);   -- encerra imediatamente
```

## Limpeza pontual e auditável de eventos já gravados
```sql
select mark_product_landing_test_events('<landing_id>', '2026-07-30 21:12+00', '2026-07-30 21:25+00');
```
Marca apenas os eventos do intervalo informado e recalcula os contadores a partir dos
registros válidos (`recalc_product_landing_counters`, de uso interno).

## Regras
- Nunca zerar contadores manualmente; sempre recalcular a partir de `is_test = false`.
- Só marcar como teste eventos comprovadamente sintéticos (janela conhecida da homologação).
- Leads de teste continuam criando cliente/oportunidade no CRM para validar o fluxo real.

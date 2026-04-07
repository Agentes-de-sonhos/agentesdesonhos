
-- Add new columns to booking_commissions
ALTER TABLE public.booking_commissions
ADD COLUMN payment_rule TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN payment_days INTEGER NOT NULL DEFAULT 0,
ADD COLUMN requires_invoice BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN invoice_status TEXT DEFAULT NULL,
ADD COLUMN invoice_number TEXT DEFAULT NULL,
ADD COLUMN invoice_issued_date DATE DEFAULT NULL,
ADD COLUMN invoice_sent_date DATE DEFAULT NULL,
ADD COLUMN internal_notes TEXT DEFAULT NULL;

-- Update existing status values to new format (old: pendente/recebido)
-- New statuses: previsao_criada, aguardando_emissao_nota, aguardando_envio_nota, aguardando_pagamento, recebido, atrasado, cancelado
UPDATE public.booking_commissions SET status = 'aguardando_pagamento' WHERE status = 'pendente';
UPDATE public.booking_commissions SET status = 'previsao_criada' WHERE status NOT IN ('recebido', 'aguardando_pagamento', 'cancelado');

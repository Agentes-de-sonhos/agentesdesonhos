
ALTER TABLE public.booking_services
ADD COLUMN non_commissionable_taxes NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN commission_type TEXT NOT NULL DEFAULT 'percentage',
ADD COLUMN commission_value NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN du_value NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN du_type TEXT NOT NULL DEFAULT 'fixed';

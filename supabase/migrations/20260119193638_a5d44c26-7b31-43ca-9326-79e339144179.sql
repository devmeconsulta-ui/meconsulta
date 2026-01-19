-- Add payment method column to consultas table
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS formas_pagamento JSONB DEFAULT NULL;

-- This column will store payment methods like:
-- [{"tipo": "dinheiro", "valor": 100}, {"tipo": "cartao_credito", "valor": 60}]
-- Or for single payment: [{"tipo": "pix", "valor": 160}]

COMMENT ON COLUMN public.consultas.formas_pagamento IS 'Array of payment methods used for this consultation. Each item has "tipo" (dinheiro, pix, cartao_debito, cartao_credito) and "valor" fields.';
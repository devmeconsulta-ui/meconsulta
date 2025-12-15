-- Drop the existing constraint
ALTER TABLE public.consultas DROP CONSTRAINT IF EXISTS consultas_status_pagamento_check;

-- Add the new constraint with 'cancelado' included
ALTER TABLE public.consultas ADD CONSTRAINT consultas_status_pagamento_check 
CHECK (status_pagamento = ANY (ARRAY['pendente'::text, 'pago'::text, 'falhou'::text, 'cancelado'::text]));
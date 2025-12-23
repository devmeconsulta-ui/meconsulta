-- Remove a constraint antiga e adiciona a nova com 'estornado'
ALTER TABLE public.consultas DROP CONSTRAINT IF EXISTS consultas_status_pagamento_check;

ALTER TABLE public.consultas ADD CONSTRAINT consultas_status_pagamento_check 
CHECK (status_pagamento = ANY (ARRAY['pendente'::text, 'pago'::text, 'falhou'::text, 'cancelado'::text, 'estornado'::text]));
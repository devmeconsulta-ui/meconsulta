-- Create repasses_medico table for tracking doctor payouts
CREATE TABLE public.repasses_medico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  data_prevista_pagamento date,
  data_pagamento timestamp with time zone,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repasses_medico ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for development
CREATE POLICY "Allow all for repasses_medico" 
ON public.repasses_medico 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_repasses_medico_medico_id ON public.repasses_medico(medico_id);
CREATE INDEX idx_repasses_medico_status ON public.repasses_medico(status);
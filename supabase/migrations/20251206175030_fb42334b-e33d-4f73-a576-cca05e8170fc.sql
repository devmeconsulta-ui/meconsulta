-- Add new fields to consultas table
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS data_hora_finalizacao_medico TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalizado_medico BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finalizado_medico_id UUID REFERENCES public.medicos(id),
ADD COLUMN IF NOT EXISTS observacao_finalizacao_medico TEXT,
ADD COLUMN IF NOT EXISTS elegivel_repasse BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS incluida_em_repasse BOOLEAN DEFAULT false;

-- Create consultas_eventos table for logging
CREATE TABLE IF NOT EXISTS public.consultas_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  descricao TEXT,
  usuario_tipo TEXT NOT NULL,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on consultas_eventos
ALTER TABLE public.consultas_eventos ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for development
CREATE POLICY "Allow all for consultas_eventos" ON public.consultas_eventos
FOR ALL USING (true) WITH CHECK (true);

-- Create repasses_itens table to link consultations to repasses
CREATE TABLE IF NOT EXISTS public.repasses_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repasse_id UUID NOT NULL REFERENCES public.repasses_medico(id) ON DELETE CASCADE,
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  valor_medico NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(repasse_id, consulta_id)
);

-- Enable RLS on repasses_itens
ALTER TABLE public.repasses_itens ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for development
CREATE POLICY "Allow all for repasses_itens" ON public.repasses_itens
FOR ALL USING (true) WITH CHECK (true);

-- Add asaas_transfer_id to repasses_medico if not exists
ALTER TABLE public.repasses_medico
ADD COLUMN IF NOT EXISTS asaas_transfer_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consultas_elegivel_repasse ON public.consultas(elegivel_repasse);
CREATE INDEX IF NOT EXISTS idx_consultas_finalizado_medico ON public.consultas(finalizado_medico);
CREATE INDEX IF NOT EXISTS idx_consultas_eventos_consulta_id ON public.consultas_eventos(consulta_id);
CREATE INDEX IF NOT EXISTS idx_repasses_itens_repasse_id ON public.repasses_itens(repasse_id);
CREATE INDEX IF NOT EXISTS idx_repasses_itens_consulta_id ON public.repasses_itens(consulta_id);
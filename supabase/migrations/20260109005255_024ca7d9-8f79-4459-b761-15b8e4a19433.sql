-- Add tipo_atendimento and convenio_id columns to consultas table
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS tipo_atendimento TEXT DEFAULT 'particular',
ADD COLUMN IF NOT EXISTS convenio_id UUID REFERENCES public.convenios(id) ON DELETE SET NULL;

-- Create index for convenio lookups
CREATE INDEX IF NOT EXISTS idx_consultas_convenio_id ON public.consultas(convenio_id);
CREATE INDEX IF NOT EXISTS idx_consultas_tipo_atendimento ON public.consultas(tipo_atendimento);
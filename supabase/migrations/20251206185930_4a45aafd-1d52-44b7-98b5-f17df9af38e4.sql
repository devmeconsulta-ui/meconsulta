
-- Add local_id field directly to consultas for better location tracking
ALTER TABLE public.consultas 
ADD COLUMN local_id uuid REFERENCES public.locais_atendimento(id);

-- Create index for better query performance
CREATE INDEX idx_consultas_local_id ON public.consultas(local_id);

-- Comment explaining the field
COMMENT ON COLUMN public.consultas.local_id IS 'Local de atendimento da consulta, independente do agenda_slot';

-- Add patient finalization fields to consultas table
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS finalizado_paciente boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_hora_finalizacao_paciente timestamp with time zone,
ADD COLUMN IF NOT EXISTS observacao_finalizacao_paciente text;

-- Add consulta_id to avaliacoes_medico if not exists
ALTER TABLE public.avaliacoes_medico
ADD COLUMN IF NOT EXISTS consulta_id uuid REFERENCES public.consultas(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_avaliacoes_medico_consulta_id ON public.avaliacoes_medico(consulta_id);
CREATE INDEX IF NOT EXISTS idx_consultas_finalizado_paciente ON public.consultas(finalizado_paciente);

-- Add comment for documentation
COMMENT ON COLUMN public.consultas.finalizado_paciente IS 'Whether the patient has confirmed they attended the appointment';
COMMENT ON COLUMN public.consultas.data_hora_finalizacao_paciente IS 'Timestamp when patient confirmed attendance';
COMMENT ON COLUMN public.consultas.observacao_finalizacao_paciente IS 'Optional observation from patient about the appointment';
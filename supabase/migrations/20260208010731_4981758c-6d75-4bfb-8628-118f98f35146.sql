-- Add fila_id column to omni_ia_agendamentos_config
ALTER TABLE public.omni_ia_agendamentos_config 
ADD COLUMN IF NOT EXISTS fila_id uuid REFERENCES omni_filas(id) ON DELETE CASCADE;

-- Add permitir_agendamento and permitir_cancelamento columns
ALTER TABLE public.omni_ia_agendamentos_config 
ADD COLUMN IF NOT EXISTS permitir_agendamento boolean DEFAULT false;

ALTER TABLE public.omni_ia_agendamentos_config 
ADD COLUMN IF NOT EXISTS permitir_cancelamento boolean DEFAULT true;

-- Create index for fila_id
CREATE INDEX IF NOT EXISTS idx_omni_ia_agendamentos_config_fila_id 
ON public.omni_ia_agendamentos_config(fila_id);
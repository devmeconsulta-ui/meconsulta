-- Add location fields to pacientes table
ALTER TABLE public.pacientes 
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS bairro text;

-- Create paciente_favoritos table
CREATE TABLE IF NOT EXISTS public.paciente_favoritos (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(paciente_id, medico_id)
);

-- Enable RLS
ALTER TABLE public.paciente_favoritos ENABLE ROW LEVEL SECURITY;

-- RLS policy for paciente_favoritos (development - allow all)
CREATE POLICY "Allow all for development" ON public.paciente_favoritos
FOR ALL USING (true) WITH CHECK (true);
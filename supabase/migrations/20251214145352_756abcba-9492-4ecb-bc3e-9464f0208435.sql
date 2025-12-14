-- Add clinica_id and todos_medicos columns to usuarios_clinica
ALTER TABLE public.usuarios_clinica 
ADD COLUMN IF NOT EXISTS clinica_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS todos_medicos boolean DEFAULT false;
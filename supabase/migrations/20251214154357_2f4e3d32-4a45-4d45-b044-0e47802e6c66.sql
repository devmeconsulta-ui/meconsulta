-- Add column to store selected doctor IDs for clinic users
ALTER TABLE public.usuarios_clinica 
ADD COLUMN IF NOT EXISTS medicos_ids uuid[] DEFAULT NULL;

-- Comment for clarity
COMMENT ON COLUMN public.usuarios_clinica.medicos_ids IS 'Array of doctor IDs the user has access to (when todos_medicos is false)';
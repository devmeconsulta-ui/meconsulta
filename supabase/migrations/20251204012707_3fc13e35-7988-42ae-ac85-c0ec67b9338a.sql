-- Add papel (role) column to usuarios table for admin panel access control
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS papel text DEFAULT 'atendente';

-- Add constraint to ensure valid papel values
ALTER TABLE public.usuarios
ADD CONSTRAINT usuarios_papel_check 
CHECK (papel IN ('atendente', 'supervisor', 'admin', 'superadmin'));

-- Update existing admin user to be superadmin
UPDATE public.usuarios 
SET papel = 'superadmin' 
WHERE tipo = 'admin';
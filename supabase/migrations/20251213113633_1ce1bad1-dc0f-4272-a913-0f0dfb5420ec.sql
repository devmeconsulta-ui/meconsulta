-- Drop existing constraint and add new one with 'clinica' included
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_papel_check;

ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_papel_check 
CHECK (papel = ANY (ARRAY['atendente'::text, 'supervisor'::text, 'admin'::text, 'superadmin'::text, 'medico'::text, 'paciente'::text, 'clinica'::text]));
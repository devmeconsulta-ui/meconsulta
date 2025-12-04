-- Remover constraint antiga
ALTER TABLE public.usuarios DROP CONSTRAINT usuarios_papel_check;

-- Adicionar nova constraint com todos os papéis permitidos
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_papel_check 
CHECK (papel = ANY (ARRAY['atendente', 'supervisor', 'admin', 'superadmin', 'medico', 'paciente']));
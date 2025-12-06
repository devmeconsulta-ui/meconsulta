-- Add password field to usuarios_clinica table
ALTER TABLE public.usuarios_clinica 
ADD COLUMN senha_hash text;

-- Add index for email lookups during login
CREATE INDEX idx_usuarios_clinica_email ON public.usuarios_clinica(email) WHERE email IS NOT NULL;
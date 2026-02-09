-- Add deve_trocar_senha column to usuarios_clinica table
ALTER TABLE public.usuarios_clinica 
ADD COLUMN IF NOT EXISTS deve_trocar_senha boolean DEFAULT false;
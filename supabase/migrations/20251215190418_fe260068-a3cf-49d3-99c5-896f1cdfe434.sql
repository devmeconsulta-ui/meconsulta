-- Add field to track if user must change password on first login
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS deve_trocar_senha boolean DEFAULT false;
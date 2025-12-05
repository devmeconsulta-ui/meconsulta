-- 1. Add origem column to consultas
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS origem text DEFAULT 'online';

-- 2. Add agenda_slot_id to consultas for easier slot management
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS agenda_slot_id uuid REFERENCES public.agenda_slots(id);

-- 3. Create usuarios_clinica table for internal clinic staff
CREATE TABLE IF NOT EXISTS public.usuarios_clinica (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  papel text NOT NULL DEFAULT 'secretaria',
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Enable RLS on usuarios_clinica
ALTER TABLE public.usuarios_clinica ENABLE ROW LEVEL SECURITY;

-- 5. Create permissive RLS policy for development
CREATE POLICY "Allow all for usuarios_clinica" 
ON public.usuarios_clinica 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. Add usuario_clinica_id to consultas
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS usuario_clinica_id uuid REFERENCES public.usuarios_clinica(id);
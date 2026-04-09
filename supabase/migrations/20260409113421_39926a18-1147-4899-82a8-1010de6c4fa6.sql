ALTER TABLE public.medicos
ADD COLUMN IF NOT EXISTS tempo_antecedencia_minutos integer NOT NULL DEFAULT 60;
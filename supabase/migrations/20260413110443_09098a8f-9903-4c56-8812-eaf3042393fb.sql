
-- Create table for medical record images
CREATE TABLE public.prontuario_imagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  legenda TEXT,
  categoria TEXT DEFAULT 'geral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prontuario_imagens ENABLE ROW LEVEL SECURITY;

-- Permissive policies (custom auth, privacy enforced at application level)
CREATE POLICY "Allow all for prontuario_imagens" ON public.prontuario_imagens FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for medical record images
INSERT INTO storage.buckets (id, name, public) VALUES ('prontuario-imagens', 'prontuario-imagens', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow public read prontuario-imagens" ON storage.objects FOR SELECT USING (bucket_id = 'prontuario-imagens');
CREATE POLICY "Allow authenticated upload prontuario-imagens" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prontuario-imagens');
CREATE POLICY "Allow authenticated delete prontuario-imagens" ON storage.objects FOR DELETE USING (bucket_id = 'prontuario-imagens');

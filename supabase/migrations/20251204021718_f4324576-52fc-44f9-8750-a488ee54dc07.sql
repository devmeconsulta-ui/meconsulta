-- Adicionar campos na tabela medicos
ALTER TABLE public.medicos 
ADD COLUMN IF NOT EXISTS aparecer_home boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS formacao text[] DEFAULT '{}';

-- Criar bucket para fotos dos médicos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-medicos', 'fotos-medicos', true)
ON CONFLICT (id) DO NOTHING;

-- Política para upload de fotos (médicos autenticados podem fazer upload de suas próprias fotos)
CREATE POLICY "Qualquer um pode ver fotos de medicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-medicos');

CREATE POLICY "Usuarios podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-medicos');

CREATE POLICY "Usuarios podem atualizar suas fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fotos-medicos');

CREATE POLICY "Usuarios podem deletar suas fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'fotos-medicos');
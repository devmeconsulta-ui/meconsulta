-- Create table for additional consultation procedures/items
CREATE TABLE public.consulta_procedimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  nome_procedimento TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consulta_procedimentos ENABLE ROW LEVEL SECURITY;

-- Create policy for development (same pattern as other tables)
CREATE POLICY "Allow all for consulta_procedimentos" 
ON public.consulta_procedimentos 
FOR ALL 
USING (true) 
WITH CHECK (true);
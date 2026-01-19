-- Drop existing RLS policies for metas_financeiras
DROP POLICY IF EXISTS "Clinicas podem ver suas metas" ON public.metas_financeiras;
DROP POLICY IF EXISTS "Clinicas podem criar suas metas" ON public.metas_financeiras;
DROP POLICY IF EXISTS "Clinicas podem atualizar suas metas" ON public.metas_financeiras;
DROP POLICY IF EXISTS "Clinicas podem deletar suas metas" ON public.metas_financeiras;

-- Create new permissive RLS policies for metas_financeiras
CREATE POLICY "Allow all for metas_financeiras" 
ON public.metas_financeiras 
FOR ALL 
USING (true)
WITH CHECK (true);
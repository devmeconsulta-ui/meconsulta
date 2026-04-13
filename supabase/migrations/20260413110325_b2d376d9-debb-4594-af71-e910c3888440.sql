
-- Drop restrictive RLS policies that depend on auth.uid() (custom auth doesn't use Supabase Auth)
DROP POLICY IF EXISTS "Doctors view own prontuario_livre" ON public.prontuario_livre;
DROP POLICY IF EXISTS "Doctors insert own prontuario_livre" ON public.prontuario_livre;
DROP POLICY IF EXISTS "Doctors update own prontuario_livre" ON public.prontuario_livre;
DROP POLICY IF EXISTS "Doctors delete own prontuario_livre" ON public.prontuario_livre;

DROP POLICY IF EXISTS "Doctors view own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Doctors insert own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Doctors update own anamneses" ON public.anamneses;
DROP POLICY IF EXISTS "Doctors delete own anamneses" ON public.anamneses;

CREATE POLICY "Allow all for prontuario_livre" ON public.prontuario_livre FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anamneses" ON public.anamneses FOR ALL USING (true) WITH CHECK (true);

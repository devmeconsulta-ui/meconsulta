
-- ============================================
-- ANAMNESES - Restrict to author doctor only
-- ============================================

-- Drop the permissive policy
DROP POLICY IF EXISTS "Allow all for development" ON public.anamneses;

-- Doctor can only see their own anamneses
CREATE POLICY "Doctors view own anamneses"
ON public.anamneses FOR SELECT
TO public
USING (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Doctor can only insert their own anamneses
CREATE POLICY "Doctors insert own anamneses"
ON public.anamneses FOR INSERT
TO public
WITH CHECK (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Doctor can only update their own anamneses
CREATE POLICY "Doctors update own anamneses"
ON public.anamneses FOR UPDATE
TO public
USING (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Doctor can only delete their own anamneses
CREATE POLICY "Doctors delete own anamneses"
ON public.anamneses FOR DELETE
TO public
USING (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- ============================================
-- PRONTUARIO_LIVRE - Restrict to author doctor only
-- ============================================

-- Drop the permissive policy
DROP POLICY IF EXISTS "Allow all for prontuario_livre" ON public.prontuario_livre;
DROP POLICY IF EXISTS "Allow all for development" ON public.prontuario_livre;

-- Doctor can only see their own prontuario_livre
CREATE POLICY "Doctors view own prontuario_livre"
ON public.prontuario_livre FOR SELECT
TO public
USING (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Doctor can only insert their own prontuario_livre
CREATE POLICY "Doctors insert own prontuario_livre"
ON public.prontuario_livre FOR INSERT
TO public
WITH CHECK (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Doctor can only update their own prontuario_livre
CREATE POLICY "Doctors update own prontuario_livre"
ON public.prontuario_livre FOR UPDATE
TO public
USING (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Doctor can only delete their own prontuario_livre
CREATE POLICY "Doctors delete own prontuario_livre"
ON public.prontuario_livre FOR DELETE
TO public
USING (medico_id = get_user_medico_id(auth.uid()) OR is_admin_user(auth.uid()));

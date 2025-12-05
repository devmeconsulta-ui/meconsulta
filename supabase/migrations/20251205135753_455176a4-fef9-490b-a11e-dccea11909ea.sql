-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admin can manage config_asaas" ON public.config_asaas;

-- Create permissive policy for development (like other tables)
CREATE POLICY "Allow all for config_asaas" 
ON public.config_asaas 
FOR ALL 
USING (true) 
WITH CHECK (true);
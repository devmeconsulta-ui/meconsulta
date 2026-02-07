-- Drop existing permissive policy on config_asaas
DROP POLICY IF EXISTS "Allow all for config_asaas" ON public.config_asaas;
DROP POLICY IF EXISTS "Allow all for development" ON public.config_asaas;

-- Ensure RLS is enabled
ALTER TABLE public.config_asaas ENABLE ROW LEVEL SECURITY;

-- Create restrictive policy - blocks ALL access via anon/authenticated
-- Edge functions use service_role_key which bypasses RLS, so they still work
CREATE POLICY "Block public access to config_asaas" 
ON public.config_asaas 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Add comment explaining the security measure
COMMENT ON TABLE public.config_asaas IS 'Payment gateway configuration - Access restricted to service_role only for security';
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admin can manage config_whatsapp" ON public.config_whatsapp;

-- Create a more permissive policy for development (allows all operations)
CREATE POLICY "Allow all for config_whatsapp" 
ON public.config_whatsapp 
FOR ALL 
USING (true)
WITH CHECK (true);
-- Drop existing policies on caixa_operacoes if they exist
DROP POLICY IF EXISTS "Clinicas podem ver suas operacoes de caixa" ON public.caixa_operacoes;
DROP POLICY IF EXISTS "Clinicas podem inserir operacoes de caixa" ON public.caixa_operacoes;
DROP POLICY IF EXISTS "Clinicas podem atualizar suas operacoes de caixa" ON public.caixa_operacoes;

-- Create new permissive policies for caixa_operacoes
-- Allow SELECT for authenticated users (filtered by clinica_id in app)
CREATE POLICY "Allow select caixa_operacoes for authenticated" 
ON public.caixa_operacoes 
FOR SELECT 
TO authenticated
USING (true);

-- Allow INSERT for authenticated users
CREATE POLICY "Allow insert caixa_operacoes for authenticated" 
ON public.caixa_operacoes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow UPDATE for authenticated users
CREATE POLICY "Allow update caixa_operacoes for authenticated" 
ON public.caixa_operacoes 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Drop existing policies on caixa_movimentos if they exist
DROP POLICY IF EXISTS "Clinicas podem ver seus movimentos de caixa" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "Clinicas podem inserir movimentos de caixa" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "Clinicas podem atualizar seus movimentos de caixa" ON public.caixa_movimentos;

-- Create new permissive policies for caixa_movimentos
CREATE POLICY "Allow select caixa_movimentos for authenticated" 
ON public.caixa_movimentos 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow insert caixa_movimentos for authenticated" 
ON public.caixa_movimentos 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update caixa_movimentos for authenticated" 
ON public.caixa_movimentos 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);
-- Drop existing restrictive policies on caixa_operacoes
DROP POLICY IF EXISTS "Allow insert caixa_operacoes for authenticated" ON public.caixa_operacoes;
DROP POLICY IF EXISTS "Allow select caixa_operacoes for authenticated" ON public.caixa_operacoes;
DROP POLICY IF EXISTS "Allow update caixa_operacoes for authenticated" ON public.caixa_operacoes;

-- Drop existing restrictive policies on caixa_movimentos
DROP POLICY IF EXISTS "Allow insert caixa_movimentos for authenticated" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "Allow select caixa_movimentos for authenticated" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "Allow update caixa_movimentos for authenticated" ON public.caixa_movimentos;

-- Create PERMISSIVE policies for caixa_operacoes
CREATE POLICY "Allow all for caixa_operacoes" ON public.caixa_operacoes
FOR ALL USING (true) WITH CHECK (true);

-- Create PERMISSIVE policies for caixa_movimentos
CREATE POLICY "Allow all for caixa_movimentos" ON public.caixa_movimentos
FOR ALL USING (true) WITH CHECK (true);
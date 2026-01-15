-- Remove old restrictive policies that are blocking INSERT
DROP POLICY IF EXISTS "Clinica pode criar operações de caixa" ON public.caixa_operacoes;
DROP POLICY IF EXISTS "Clinica pode ver suas operações de caixa" ON public.caixa_operacoes;
DROP POLICY IF EXISTS "Clinica pode atualizar suas operações de caixa" ON public.caixa_operacoes;

DROP POLICY IF EXISTS "Clinica pode criar movimentos de caixa" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "Clinica pode ver seus movimentos de caixa" ON public.caixa_movimentos;
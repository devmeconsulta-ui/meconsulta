-- Add valor_pretendido column to meconsulta_pay_solicitacoes table
ALTER TABLE public.meconsulta_pay_solicitacoes
ADD COLUMN valor_pretendido numeric DEFAULT NULL;
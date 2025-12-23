-- Adicionar campos de dados bancários na tabela clinicas
ALTER TABLE public.clinicas
ADD COLUMN IF NOT EXISTS banco_codigo text,
ADD COLUMN IF NOT EXISTS banco_nome text,
ADD COLUMN IF NOT EXISTS agencia text,
ADD COLUMN IF NOT EXISTS conta text,
ADD COLUMN IF NOT EXISTS tipo_conta text,
ADD COLUMN IF NOT EXISTS titular_nome text,
ADD COLUMN IF NOT EXISTS titular_cpf_cnpj text,
ADD COLUMN IF NOT EXISTS pix_key text,
ADD COLUMN IF NOT EXISTS pix_key_type text;
-- Create table for MeConsulta Pay credit requests
CREATE TABLE public.meconsulta_pay_solicitacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  data_nascimento date NOT NULL,
  nome_mae text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meconsulta_pay_solicitacoes ENABLE ROW LEVEL SECURITY;

-- RLS policy for development (permissive)
CREATE POLICY "Allow all for meconsulta_pay_solicitacoes" 
ON public.meconsulta_pay_solicitacoes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster queries by patient
CREATE INDEX idx_meconsulta_pay_solicitacoes_paciente_id ON public.meconsulta_pay_solicitacoes(paciente_id);

-- Add comment
COMMENT ON TABLE public.meconsulta_pay_solicitacoes IS 'Credit analysis requests from patients via MeConsulta Pay';
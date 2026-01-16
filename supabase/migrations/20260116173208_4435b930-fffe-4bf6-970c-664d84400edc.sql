-- Adicionar campos de permissões e automações no funil
ALTER TABLE public.crm_funis 
ADD COLUMN IF NOT EXISTS usuarios_permitidos uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS automacoes jsonb DEFAULT '{}';

-- Comentários para documentação
COMMENT ON COLUMN public.crm_funis.usuarios_permitidos IS 'Lista de IDs de usuarios_clinica com acesso ao funil. NULL = todos têm acesso';
COMMENT ON COLUMN public.crm_funis.automacoes IS 'Configurações de automações do funil (criar_lead_agendamento, mover_lead_status, etc)';
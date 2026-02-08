-- Adicionar campos para gerenciamento de follow-ups de inatividade
ALTER TABLE omni_ia_conversas 
ADD COLUMN IF NOT EXISTS ultima_mensagem_cliente timestamp with time zone,
ADD COLUMN IF NOT EXISTS followup_pendentes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS followup_executados jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ultima_interacao timestamp with time zone;

-- Índice para buscar conversas com follow-ups pendentes
CREATE INDEX IF NOT EXISTS idx_omni_ia_conversas_followup 
ON omni_ia_conversas (ultima_mensagem_cliente) 
WHERE followup_pendentes IS NOT NULL AND followup_pendentes != '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN omni_ia_conversas.ultima_mensagem_cliente IS 'Timestamp da última mensagem recebida do cliente - usado para calcular inatividade';
COMMENT ON COLUMN omni_ia_conversas.followup_pendentes IS 'Array de ações de follow-up que ainda precisam ser executadas';
COMMENT ON COLUMN omni_ia_conversas.followup_executados IS 'Array de IDs de follow-ups já executados para evitar duplicação';
COMMENT ON COLUMN omni_ia_conversas.ultima_interacao IS 'Timestamp da última interação (mensagem ou follow-up)';
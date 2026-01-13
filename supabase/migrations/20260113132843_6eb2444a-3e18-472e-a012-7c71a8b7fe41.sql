-- Adicionar campo para marcar slot como "ordem de chegada" e "encaixe"
ALTER TABLE public.agenda_slots 
ADD COLUMN IF NOT EXISTS tipo_slot text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS ordem_chegada integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hora_chegada timestamp with time zone DEFAULT NULL;

-- Comentário: tipo_slot pode ser: 'normal', 'ordem_chegada', 'encaixe'
-- ordem_chegada: número sequencial de chegada no dia
-- hora_chegada: quando o paciente chegou (para ordem de chegada)

-- Criar tabela de lista de espera
CREATE TABLE IF NOT EXISTS public.lista_espera (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  clinica_id uuid REFERENCES public.clinicas(id) ON DELETE SET NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE,
  paciente_nome text NOT NULL,
  paciente_telefone text,
  paciente_cpf text,
  motivo text,
  prioridade integer DEFAULT 0,
  posicao integer NOT NULL,
  status text DEFAULT 'aguardando',
  data_entrada timestamp with time zone DEFAULT now(),
  data_chamada timestamp with time zone,
  data_atendimento timestamp with time zone,
  observacoes text,
  usuario_clinica_id uuid REFERENCES public.usuarios_clinica(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lista_espera_medico_status ON public.lista_espera(medico_id, status);
CREATE INDEX IF NOT EXISTS idx_lista_espera_posicao ON public.lista_espera(medico_id, posicao);
CREATE INDEX IF NOT EXISTS idx_agenda_slots_tipo ON public.agenda_slots(tipo_slot);

-- Enable RLS
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;

-- RLS Policy (permitindo acesso em desenvolvimento)
CREATE POLICY "Allow all for lista_espera" 
ON public.lista_espera 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Comentário sobre status da lista de espera:
-- 'aguardando' - Na fila aguardando vaga
-- 'chamado' - Foi chamado para agendar
-- 'agendado' - Conseguiu agendar consulta
-- 'cancelado' - Saiu da fila
-- 'expirado' - Ficou muito tempo sem responder
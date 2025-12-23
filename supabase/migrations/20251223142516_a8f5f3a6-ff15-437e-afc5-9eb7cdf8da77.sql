-- Remove the old check constraint
ALTER TABLE public.consultas DROP CONSTRAINT IF EXISTS consultas_status_consulta_check;

-- Add the new check constraint with all status values
ALTER TABLE public.consultas ADD CONSTRAINT consultas_status_consulta_check 
CHECK (status_consulta IN (
  'agendada',
  'aguardando_pagamento', 
  'confirmada',
  'aguardando',
  'atendendo',
  'concluida',
  'nao_compareceu',
  'cancelada',
  'realizada',
  'atendida_medico'
));
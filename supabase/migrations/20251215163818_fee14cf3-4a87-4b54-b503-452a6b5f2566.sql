-- Remove a constraint antiga e adiciona uma nova com todos os status necessários
ALTER TABLE public.consultas DROP CONSTRAINT IF EXISTS consultas_status_consulta_check;

ALTER TABLE public.consultas ADD CONSTRAINT consultas_status_consulta_check 
CHECK (status_consulta IN (
  'aguardando_pagamento',
  'confirmada', 
  'atendida_medico',
  'concluida',
  'cancelada',
  'nao_compareceu'
));
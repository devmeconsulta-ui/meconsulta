-- Corrigir consultas existentes que não têm clinica_id mas têm local_id com clínica associada
UPDATE consultas c
SET clinica_id = l.clinica_id
FROM locais_atendimento l
WHERE c.local_id = l.id
AND c.clinica_id IS NULL
AND l.clinica_id IS NOT NULL;

-- Também corrigir consultas onde o médico está vinculado a uma clínica única
UPDATE consultas c
SET clinica_id = cm.clinica_id
FROM clinicas_medicos cm
WHERE c.medico_id = cm.medico_id
AND c.clinica_id IS NULL
AND cm.ativo = true
AND NOT EXISTS (
  SELECT 1 FROM clinicas_medicos cm2 
  WHERE cm2.medico_id = c.medico_id 
  AND cm2.clinica_id != cm.clinica_id 
  AND cm2.ativo = true
);

-- Atualizar consultas que têm local_id mas clinica_id NULL
UPDATE consultas c
SET clinica_id = l.clinica_id
FROM locais_atendimento l
WHERE c.local_id = l.id
AND c.clinica_id IS NULL
AND l.clinica_id IS NOT NULL;

-- Também atualizar consultas onde o médico pertence a uma clínica mas clinica_id está NULL
UPDATE consultas c
SET clinica_id = cm.clinica_id
FROM clinicas_medicos cm
WHERE c.medico_id = cm.medico_id
AND c.clinica_id IS NULL
AND cm.ativo = true
AND NOT EXISTS (SELECT 1 FROM locais_atendimento l WHERE l.id = c.local_id);

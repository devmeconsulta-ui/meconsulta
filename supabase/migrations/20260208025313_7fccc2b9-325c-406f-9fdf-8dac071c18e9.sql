-- Corrigir consultas da IA que não têm nome_paciente_consulta preenchido
UPDATE consultas c
SET nome_paciente_consulta = p.nome
FROM pacientes p
WHERE c.paciente_id = p.id
AND c.origem = 'ia_whatsapp'
AND (c.nome_paciente_consulta IS NULL OR c.nome_paciente_consulta = '')
AND c.paciente_id IS NOT NULL;
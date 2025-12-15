-- Update consultas to link to CLINICA SAUDE E VIDA for doctors associated with this clinic
UPDATE consultas
SET clinica_id = '5b918288-f44a-494a-9b43-70253bb6670b'
WHERE medico_id IN (
  SELECT medico_id FROM clinicas_medicos WHERE clinica_id = '5b918288-f44a-494a-9b43-70253bb6670b'
)
AND clinica_id IS NULL;
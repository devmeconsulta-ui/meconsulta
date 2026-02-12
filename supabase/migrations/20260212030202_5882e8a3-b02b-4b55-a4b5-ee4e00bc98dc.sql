
-- Delete mensagens linked to Facebook/Instagram ID contacts
DELETE FROM omni_mensagens 
WHERE atendimento_id IN (
  SELECT id FROM omni_atendimentos 
  WHERE contato_id IN (
    SELECT id FROM omni_contatos 
    WHERE length(telefone) >= 14 AND telefone NOT LIKE '55%'
  )
);

-- Delete notas internas linked to those atendimentos
DELETE FROM omni_notas_internas 
WHERE atendimento_id IN (
  SELECT id FROM omni_atendimentos 
  WHERE contato_id IN (
    SELECT id FROM omni_contatos 
    WHERE length(telefone) >= 14 AND telefone NOT LIKE '55%'
  )
);

-- Delete atendimentos linked to those contacts
DELETE FROM omni_atendimentos 
WHERE contato_id IN (
  SELECT id FROM omni_contatos 
  WHERE length(telefone) >= 14 AND telefone NOT LIKE '55%'
);

-- Delete the fake contacts themselves
DELETE FROM omni_contatos 
WHERE length(telefone) >= 14 AND telefone NOT LIKE '55%';

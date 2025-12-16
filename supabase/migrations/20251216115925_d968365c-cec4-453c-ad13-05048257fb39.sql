-- Atualizar consultas antigas que não têm local_id mas têm agenda_slot com local_id
UPDATE consultas c
SET local_id = a.local_id
FROM agenda_slots a
WHERE c.agenda_slot_id = a.id
  AND c.local_id IS NULL
  AND a.local_id IS NOT NULL;
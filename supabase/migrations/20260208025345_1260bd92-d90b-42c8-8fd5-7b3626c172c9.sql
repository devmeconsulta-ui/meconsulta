-- Atualizar local_id nas consultas que têm agenda_slot_id mas local_id nulo
UPDATE consultas c
SET local_id = s.local_id
FROM agenda_slots s
WHERE c.agenda_slot_id = s.id
AND c.local_id IS NULL
AND s.local_id IS NOT NULL;
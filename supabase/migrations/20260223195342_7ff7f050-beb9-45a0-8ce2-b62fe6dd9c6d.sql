
-- Fix existing consultations where medico_id doesn't match the slot's medico_id
UPDATE consultas c
SET medico_id = s.medico_id
FROM agenda_slots s
WHERE c.agenda_slot_id = s.id
  AND c.medico_id != s.medico_id
  AND c.data_hora >= now() - interval '30 days';

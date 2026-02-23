
-- Fix mismatched agenda_slots: update slot medico_id to match consultation medico_id
-- This fixes 8 active consultations where the slot belongs to the wrong doctor
UPDATE agenda_slots SET medico_id = c.medico_id
FROM consultas c
WHERE c.agenda_slot_id = agenda_slots.id
  AND c.medico_id != agenda_slots.medico_id
  AND c.status_consulta NOT IN ('cancelada', 'concluida');

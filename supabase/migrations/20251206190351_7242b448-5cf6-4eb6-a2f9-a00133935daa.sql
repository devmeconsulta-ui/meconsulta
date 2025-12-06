
-- Update existing consultas to populate local_id from agenda_slot
UPDATE public.consultas c
SET local_id = a.local_id
FROM public.agenda_slots a
WHERE c.agenda_slot_id = a.id
  AND c.local_id IS NULL
  AND a.local_id IS NOT NULL;


-- Step 1: Create junction table locais_medicos
CREATE TABLE public.locais_medicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  local_id UUID NOT NULL REFERENCES public.locais_atendimento(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(local_id, medico_id)
);

ALTER TABLE public.locais_medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to locais_medicos" ON public.locais_medicos FOR ALL USING (true) WITH CHECK (true);

-- Step 2: For each clinic, pick one "keeper" local per (nome_local, clinica_id) group
-- and migrate all medico links to the junction table
DO $$
DECLARE
  rec RECORD;
  keeper_id UUID;
BEGIN
  -- For each unique (nome_local, clinica_id) group, process duplicates
  FOR rec IN
    SELECT DISTINCT nome_local, clinica_id
    FROM locais_atendimento
    WHERE clinica_id IS NOT NULL
    GROUP BY nome_local, clinica_id
    HAVING COUNT(*) > 1
  LOOP
    -- Pick the first created local as keeper
    SELECT id INTO keeper_id
    FROM locais_atendimento
    WHERE nome_local = rec.nome_local AND clinica_id = rec.clinica_id
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1;

    -- Insert all medico links into junction table
    INSERT INTO locais_medicos (local_id, medico_id, ativo)
    SELECT keeper_id, la.medico_id, la.ativo
    FROM locais_atendimento la
    WHERE la.nome_local = rec.nome_local AND la.clinica_id = rec.clinica_id
    ON CONFLICT (local_id, medico_id) DO NOTHING;

    -- Update agenda_slots pointing to duplicate locais to point to keeper
    UPDATE agenda_slots
    SET local_id = keeper_id
    WHERE local_id IN (
      SELECT id FROM locais_atendimento
      WHERE nome_local = rec.nome_local AND clinica_id = rec.clinica_id AND id != keeper_id
    );

    -- Update consultas pointing to duplicate locais to point to keeper
    UPDATE consultas
    SET local_id = keeper_id
    WHERE local_id IN (
      SELECT id FROM locais_atendimento
      WHERE nome_local = rec.nome_local AND clinica_id = rec.clinica_id AND id != keeper_id
    );

    -- Delete the duplicate locais (keep the keeper)
    DELETE FROM locais_atendimento
    WHERE nome_local = rec.nome_local AND clinica_id = rec.clinica_id AND id != keeper_id;
  END LOOP;

  -- Also create junction entries for non-duplicate locais that don't have entries yet
  INSERT INTO locais_medicos (local_id, medico_id, ativo)
  SELECT la.id, la.medico_id, la.ativo
  FROM locais_atendimento la
  WHERE la.clinica_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM locais_medicos lm WHERE lm.local_id = la.id AND lm.medico_id = la.medico_id
    );
END $$;

-- Step 3: Make medico_id nullable (no longer the primary link)
ALTER TABLE public.locais_atendimento ALTER COLUMN medico_id DROP NOT NULL;

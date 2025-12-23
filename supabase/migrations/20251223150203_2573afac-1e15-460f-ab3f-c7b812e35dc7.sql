-- Primeiro remove as políticas existentes
DROP POLICY IF EXISTS "Médicos podem criar documentos" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Médicos podem ver documentos que criaram" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Médicos podem atualizar documentos que criaram" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Médicos podem deletar documentos que criaram" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Pacientes podem ver seus próprios documentos" ON prescricoes_documentos;

-- Recria as políticas como PERMISSIVE
CREATE POLICY "Médicos podem criar documentos"
ON prescricoes_documentos
FOR INSERT
TO authenticated
WITH CHECK (
  medico_id IN (
    SELECT id FROM medicos WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Médicos podem ver documentos que criaram"
ON prescricoes_documentos
FOR SELECT
TO authenticated
USING (
  medico_id IN (
    SELECT id FROM medicos WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Médicos podem atualizar documentos que criaram"
ON prescricoes_documentos
FOR UPDATE
TO authenticated
USING (
  medico_id IN (
    SELECT id FROM medicos WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Médicos podem deletar documentos que criaram"
ON prescricoes_documentos
FOR DELETE
TO authenticated
USING (
  medico_id IN (
    SELECT id FROM medicos WHERE usuario_id = auth.uid()
  )
);

CREATE POLICY "Pacientes podem ver seus próprios documentos"
ON prescricoes_documentos
FOR SELECT
TO authenticated
USING (
  paciente_id IN (
    SELECT id FROM pacientes WHERE usuario_id = auth.uid()
  )
);
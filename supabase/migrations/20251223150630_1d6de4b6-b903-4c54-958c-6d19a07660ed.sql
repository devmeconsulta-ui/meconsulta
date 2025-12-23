-- Remove todas as políticas existentes
DROP POLICY IF EXISTS "Médicos podem criar documentos" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Médicos podem ver documentos que criaram" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Médicos podem atualizar documentos que criaram" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Médicos podem deletar documentos que criaram" ON prescricoes_documentos;
DROP POLICY IF EXISTS "Pacientes podem ver seus próprios documentos" ON prescricoes_documentos;

-- Cria política permissiva para desenvolvimento (igual às outras tabelas)
CREATE POLICY "Allow all for development"
ON prescricoes_documentos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
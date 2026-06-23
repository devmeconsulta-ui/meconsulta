
CREATE POLICY "pacientes_documentos_read" ON storage.objects FOR SELECT USING (bucket_id = 'pacientes-documentos');
CREATE POLICY "pacientes_documentos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pacientes-documentos');
CREATE POLICY "pacientes_documentos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'pacientes-documentos');
CREATE POLICY "pacientes_documentos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'pacientes-documentos');

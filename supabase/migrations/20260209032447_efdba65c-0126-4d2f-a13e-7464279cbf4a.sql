-- Normalize estado values in locais_atendimento to use standard abbreviations
UPDATE public.locais_atendimento 
SET estado = 'MG' 
WHERE UPPER(TRIM(estado)) IN ('MG', 'MINAS GERAIS');

-- Normalize cidade values to proper case (Montes Claros)
UPDATE public.locais_atendimento 
SET cidade = 'Montes Claros' 
WHERE UPPER(TRIM(cidade)) = 'MONTES CLAROS';
-- Corrigir consulta online da Dra Laurilia que está sem clinica_id
UPDATE consultas 
SET clinica_id = '2411ffe4-7602-441b-8125-a03523837416'
WHERE id = '2eaa6525-200c-466a-adfb-59e0eb9679af' 
AND clinica_id IS NULL;
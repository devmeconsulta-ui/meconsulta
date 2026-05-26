
WITH dups AS (
  SELECT id, clinica_id, contato_id,
         ROW_NUMBER() OVER (PARTITION BY clinica_id, contato_id ORDER BY created_at DESC) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY clinica_id, contato_id ORDER BY created_at DESC) AS keep_id
  FROM public.omni_atendimentos
  WHERE status IN ('aguardando','em_atendimento')
),
to_merge AS (
  SELECT id AS old_id, keep_id FROM dups WHERE rn > 1
)
UPDATE public.omni_mensagens m
SET atendimento_id = tm.keep_id
FROM to_merge tm
WHERE m.atendimento_id = tm.old_id;

WITH dups AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY clinica_id, contato_id ORDER BY created_at DESC) AS rn
  FROM public.omni_atendimentos
  WHERE status IN ('aguardando','em_atendimento')
)
UPDATE public.omni_atendimentos a
SET status = 'finalizado', data_fechamento = now()
FROM dups d
WHERE a.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS omni_atendimentos_unique_active_per_contato
ON public.omni_atendimentos (clinica_id, contato_id)
WHERE status IN ('aguardando','em_atendimento');

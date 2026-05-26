-- Adicionar suporte a Evolution API v2 em managed_instances
ALTER TABLE public.managed_instances
  ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT,
  ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'evolution';

-- Marcar instâncias já existentes (Z-API) como legacy
UPDATE public.managed_instances
SET provider = 'zapi_legacy'
WHERE provider = 'evolution'
  AND (external_instance_id IS NOT NULL OR external_token IS NOT NULL);

-- Índice para lookup rápido por nome de instância Evolution
CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_instances_evolution_name
  ON public.managed_instances(evolution_instance_name)
  WHERE evolution_instance_name IS NOT NULL;

-- Índice para filtrar por provedor
CREATE INDEX IF NOT EXISTS idx_managed_instances_provider
  ON public.managed_instances(provider);
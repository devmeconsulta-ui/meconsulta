-- Corrigir a URL base do Asaas (remover /api duplicado)
UPDATE config_asaas 
SET base_url = 'https://api.asaas.com/v3',
    updated_at = now()
WHERE ativo = true;
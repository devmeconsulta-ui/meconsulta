-- Adicionar coluna para rastrear se a consulta já foi sincronizada com o caixa
ALTER TABLE public.consultas 
ADD COLUMN IF NOT EXISTS sincronizado_caixa boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS caixa_movimento_id uuid REFERENCES public.caixa_movimentos(id);

-- Criar índice para consultas não sincronizadas pagas
CREATE INDEX IF NOT EXISTS idx_consultas_caixa_sync 
ON public.consultas (clinica_id, status_pagamento, sincronizado_caixa) 
WHERE status_pagamento = 'pago' AND sincronizado_caixa = false;
-- Tabela para gerenciar abertura/fechamento de caixa
CREATE TABLE public.caixa_operacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  usuario_clinica_id UUID REFERENCES public.usuarios_clinica(id),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('abertura', 'fechamento')),
  saldo_inicial NUMERIC(10,2) DEFAULT 0,
  saldo_final NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para movimentações do caixa
CREATE TABLE public.caixa_movimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  operacao_abertura_id UUID REFERENCES public.caixa_operacoes(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'sangria', 'reforco')),
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT NOT NULL,
  forma_pagamento VARCHAR(20),
  usuario_clinica_id UUID REFERENCES public.usuarios_clinica(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.caixa_operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;

-- Políticas para caixa_operacoes
CREATE POLICY "Clinica pode ver suas operações de caixa"
ON public.caixa_operacoes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clinicas c
  WHERE c.id = clinica_id
  AND (c.usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios_clinica uc 
    WHERE uc.clinica_id = c.id 
    AND uc.medico_id IN (SELECT m.id FROM medicos m WHERE m.usuario_id = auth.uid())
    AND uc.ativo = true
  ))
));

CREATE POLICY "Clinica pode criar operações de caixa"
ON public.caixa_operacoes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM clinicas c
  WHERE c.id = clinica_id
  AND (c.usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios_clinica uc 
    WHERE uc.clinica_id = c.id 
    AND uc.medico_id IN (SELECT m.id FROM medicos m WHERE m.usuario_id = auth.uid())
    AND uc.ativo = true
  ))
));

CREATE POLICY "Clinica pode atualizar suas operações de caixa"
ON public.caixa_operacoes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM clinicas c
  WHERE c.id = clinica_id
  AND (c.usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios_clinica uc 
    WHERE uc.clinica_id = c.id 
    AND uc.medico_id IN (SELECT m.id FROM medicos m WHERE m.usuario_id = auth.uid())
    AND uc.ativo = true
  ))
));

-- Políticas para caixa_movimentos
CREATE POLICY "Clinica pode ver seus movimentos de caixa"
ON public.caixa_movimentos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM clinicas c
  WHERE c.id = clinica_id
  AND (c.usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios_clinica uc 
    WHERE uc.clinica_id = c.id 
    AND uc.medico_id IN (SELECT m.id FROM medicos m WHERE m.usuario_id = auth.uid())
    AND uc.ativo = true
  ))
));

CREATE POLICY "Clinica pode criar movimentos de caixa"
ON public.caixa_movimentos FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM clinicas c
  WHERE c.id = clinica_id
  AND (c.usuario_id = auth.uid() OR EXISTS (
    SELECT 1 FROM usuarios_clinica uc 
    WHERE uc.clinica_id = c.id 
    AND uc.medico_id IN (SELECT m.id FROM medicos m WHERE m.usuario_id = auth.uid())
    AND uc.ativo = true
  ))
));

-- Índices para performance
CREATE INDEX idx_caixa_operacoes_clinica ON public.caixa_operacoes(clinica_id);
CREATE INDEX idx_caixa_operacoes_created ON public.caixa_operacoes(created_at DESC);
CREATE INDEX idx_caixa_movimentos_clinica ON public.caixa_movimentos(clinica_id);
CREATE INDEX idx_caixa_movimentos_operacao ON public.caixa_movimentos(operacao_abertura_id);
CREATE INDEX idx_caixa_movimentos_created ON public.caixa_movimentos(created_at DESC);
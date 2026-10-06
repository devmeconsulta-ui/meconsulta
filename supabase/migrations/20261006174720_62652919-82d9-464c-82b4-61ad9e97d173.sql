-- 1) Data real do pagamento da consulta
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS data_pagamento timestamptz;
UPDATE public.consultas SET data_pagamento = data_hora WHERE status_pagamento = 'pago' AND data_pagamento IS NULL;

CREATE OR REPLACE FUNCTION public.set_consulta_data_pagamento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status_pagamento = 'pago' AND (TG_OP = 'INSERT' OR OLD.status_pagamento IS DISTINCT FROM 'pago') THEN
    NEW.data_pagamento := COALESCE(NEW.data_pagamento, now());
  ELSIF NEW.status_pagamento IS DISTINCT FROM 'pago' THEN
    NEW.data_pagamento := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_consulta_data_pagamento ON public.consultas;
CREATE TRIGGER trg_consulta_data_pagamento BEFORE INSERT OR UPDATE OF status_pagamento ON public.consultas
FOR EACH ROW EXECUTE FUNCTION public.set_consulta_data_pagamento();

-- 2) Histórico de alterações financeiras
CREATE TABLE IF NOT EXISTS public.financeiro_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id uuid,
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  acao text NOT NULL,
  campos jsonb,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.financeiro_auditoria TO anon, authenticated;
GRANT ALL ON public.financeiro_auditoria TO service_role;
ALTER TABLE public.financeiro_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financeiro_auditoria_acesso" ON public.financeiro_auditoria FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_fin_aud_clinica ON public.financeiro_auditoria (clinica_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_financeiro_auditoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  watched text[];
  diff jsonb := '{}'::jsonb;
  k text;
  o jsonb; n jsonb;
  usr text := current_setting('request.headers', true)::jsonb ->> 'x-usuario-nome';
BEGIN
  IF TG_TABLE_NAME = 'consultas' THEN watched := ARRAY['status_pagamento','valor_consulta','formas_pagamento','valor_medico'];
  ELSE watched := ARRAY['status','valor','data_pagamento','data_recebimento','data_vencimento','descricao']; END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO financeiro_auditoria(clinica_id, tabela, registro_id, acao, campos, usuario_nome)
    VALUES (OLD.clinica_id, TG_TABLE_NAME, OLD.id, 'excluido', to_jsonb(OLD), usr);
    RETURN OLD;
  END IF;
  n := to_jsonb(NEW);
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'consultas' THEN RETURN NEW; END IF;
    INSERT INTO financeiro_auditoria(clinica_id, tabela, registro_id, acao, campos, usuario_nome)
    VALUES (NEW.clinica_id, TG_TABLE_NAME, NEW.id, 'criado', n, usr);
    RETURN NEW;
  END IF;
  o := to_jsonb(OLD);
  FOREACH k IN ARRAY watched LOOP
    IF (o -> k) IS DISTINCT FROM (n -> k) THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('de', o -> k, 'para', n -> k));
    END IF;
  END LOOP;
  IF diff <> '{}'::jsonb THEN
    INSERT INTO financeiro_auditoria(clinica_id, tabela, registro_id, acao, campos, usuario_nome)
    VALUES (NEW.clinica_id, TG_TABLE_NAME, NEW.id, 'alterado', diff, usr);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_aud_consultas ON public.consultas;
CREATE TRIGGER trg_aud_consultas AFTER UPDATE ON public.consultas FOR EACH ROW EXECUTE FUNCTION public.log_financeiro_auditoria();
DROP TRIGGER IF EXISTS trg_aud_contas_pagar ON public.contas_pagar;
CREATE TRIGGER trg_aud_contas_pagar AFTER INSERT OR UPDATE OR DELETE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.log_financeiro_auditoria();
DROP TRIGGER IF EXISTS trg_aud_contas_receber ON public.contas_receber;
CREATE TRIGGER trg_aud_contas_receber AFTER INSERT OR UPDATE OR DELETE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.log_financeiro_auditoria();

-- 3) Despesas recorrentes
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS recorrente boolean NOT NULL DEFAULT false;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS recorrencia_origem_id uuid REFERENCES public.contas_pagar(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contas_pagar_recorrencia_mes ON public.contas_pagar (recorrencia_origem_id, data_vencimento) WHERE recorrencia_origem_id IS NOT NULL;
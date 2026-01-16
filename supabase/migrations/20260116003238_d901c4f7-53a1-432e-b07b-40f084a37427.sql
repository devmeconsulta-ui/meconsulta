-- Função para criar notificação de consulta agendada
CREATE OR REPLACE FUNCTION public.notify_clinica_nova_consulta()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notifica se a consulta tem clinica_id
  IF NEW.clinica_id IS NOT NULL THEN
    INSERT INTO public.clinica_notificacoes (clinica_id, titulo, mensagem, tipo, categoria, referencia_id)
    VALUES (
      NEW.clinica_id,
      'Nova consulta agendada',
      'Uma nova consulta foi agendada para ' || to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI'),
      'info',
      'consultas',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para criar notificação de consulta cancelada
CREATE OR REPLACE FUNCTION public.notify_clinica_consulta_cancelada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clinica_id IS NOT NULL AND OLD.status_consulta <> 'cancelada' AND NEW.status_consulta = 'cancelada' THEN
    INSERT INTO public.clinica_notificacoes (clinica_id, titulo, mensagem, tipo, categoria, referencia_id)
    VALUES (
      NEW.clinica_id,
      'Consulta cancelada',
      'Uma consulta foi cancelada. Data: ' || to_char(NEW.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY às HH24:MI'),
      'alerta',
      'consultas',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para criar notificação de pagamento confirmado
CREATE OR REPLACE FUNCTION public.notify_clinica_pagamento_confirmado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clinica_id IS NOT NULL AND OLD.status_pagamento <> 'pago' AND NEW.status_pagamento = 'pago' THEN
    INSERT INTO public.clinica_notificacoes (clinica_id, titulo, mensagem, tipo, categoria, referencia_id)
    VALUES (
      NEW.clinica_id,
      'Pagamento confirmado',
      'Pagamento de R$ ' || REPLACE(TO_CHAR(NEW.valor_consulta, 'FM999G999D00'), '.', ',') || ' foi confirmado',
      'sucesso',
      'financeiro',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para criar notificação de vencimento de conta a pagar
CREATE OR REPLACE FUNCTION public.notify_clinica_conta_vencimento()
RETURNS TRIGGER AS $$
DECLARE
  dias_ate_vencimento INTEGER;
BEGIN
  dias_ate_vencimento := NEW.data_vencimento - CURRENT_DATE;
  
  -- Notifica se vence em 3 dias, hoje ou já venceu
  IF dias_ate_vencimento <= 3 AND dias_ate_vencimento >= 0 AND NEW.status = 'pendente' THEN
    INSERT INTO public.clinica_notificacoes (clinica_id, titulo, mensagem, tipo, categoria, referencia_id)
    VALUES (
      NEW.clinica_id,
      CASE 
        WHEN dias_ate_vencimento = 0 THEN 'Conta vence hoje!'
        WHEN dias_ate_vencimento = 1 THEN 'Conta vence amanhã'
        ELSE 'Conta vence em ' || dias_ate_vencimento || ' dias'
      END,
      'Conta a pagar: ' || NEW.descricao || ' - R$ ' || REPLACE(TO_CHAR(NEW.valor, 'FM999G999D00'), '.', ','),
      CASE WHEN dias_ate_vencimento = 0 THEN 'alerta' ELSE 'aviso' END,
      'financeiro',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para nova consulta
DROP TRIGGER IF EXISTS trigger_notify_clinica_nova_consulta ON public.consultas;
CREATE TRIGGER trigger_notify_clinica_nova_consulta
  AFTER INSERT ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_clinica_nova_consulta();

-- Trigger para consulta cancelada
DROP TRIGGER IF EXISTS trigger_notify_clinica_consulta_cancelada ON public.consultas;
CREATE TRIGGER trigger_notify_clinica_consulta_cancelada
  AFTER UPDATE ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_clinica_consulta_cancelada();

-- Trigger para pagamento confirmado
DROP TRIGGER IF EXISTS trigger_notify_clinica_pagamento_confirmado ON public.consultas;
CREATE TRIGGER trigger_notify_clinica_pagamento_confirmado
  AFTER UPDATE ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_clinica_pagamento_confirmado();

-- Trigger para vencimento de conta a pagar
DROP TRIGGER IF EXISTS trigger_notify_clinica_conta_vencimento ON public.contas_pagar;
CREATE TRIGGER trigger_notify_clinica_conta_vencimento
  AFTER INSERT OR UPDATE ON public.contas_pagar
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_clinica_conta_vencimento();
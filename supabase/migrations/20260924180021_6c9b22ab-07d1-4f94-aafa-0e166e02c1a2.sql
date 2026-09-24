ALTER TABLE public.omni_filas ADD COLUMN IF NOT EXISTS wac_conexao_id uuid REFERENCES public.wac_conexoes(id) ON DELETE SET NULL;
ALTER TABLE public.omni_atendimentos ADD COLUMN IF NOT EXISTS wac_conexao_id uuid REFERENCES public.wac_conexoes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_omni_filas_wac ON public.omni_filas(wac_conexao_id);
CREATE INDEX IF NOT EXISTS idx_omni_atend_wac ON public.omni_atendimentos(wac_conexao_id);

CREATE OR REPLACE FUNCTION public.enqueue_agent_message()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.direcao = 'saida' AND NEW.tipo != 'nota_interna' THEN
    INSERT INTO public.message_outbox (clinica_id, atendimento_id, mensagem_id, payload)
    SELECT a.clinica_id, NEW.atendimento_id, NEW.id,
      jsonb_build_object('phone', c.telefone, 'message', NEW.conteudo,
        'content_type', COALESCE(NEW.tipo, 'text'), 'media_url', NEW.arquivo_url, 'file_name', NEW.arquivo_nome)
    FROM public.omni_atendimentos a
    JOIN public.omni_contatos c ON c.id = a.contato_id
    WHERE a.id = NEW.atendimento_id AND a.wac_conexao_id IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;
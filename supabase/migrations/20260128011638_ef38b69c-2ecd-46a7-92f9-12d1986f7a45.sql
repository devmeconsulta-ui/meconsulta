-- Habilitar Realtime para omni_mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.omni_mensagens;

-- Também adicionar omni_atendimentos para atualizações de status em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.omni_atendimentos;
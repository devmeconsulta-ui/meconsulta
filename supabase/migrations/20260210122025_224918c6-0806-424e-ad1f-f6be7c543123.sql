-- Fix contacts that were incorrectly named "Você" (from fromMe messages)
UPDATE public.omni_contatos SET nome = telefone WHERE nome = 'Você';
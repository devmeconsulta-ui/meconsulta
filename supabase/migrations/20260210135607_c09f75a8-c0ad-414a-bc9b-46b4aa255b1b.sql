
-- Fix contacts incorrectly named "CenterMed Consultórios" (instance owner name) - reset to phone number
UPDATE public.omni_contatos 
SET nome = telefone 
WHERE nome = 'CenterMed Consultórios' AND telefone != '0';

-- Also fix "WhatsApp Business" generic names
UPDATE public.omni_contatos 
SET nome = telefone 
WHERE nome = 'WhatsApp Business' AND telefone != '0';

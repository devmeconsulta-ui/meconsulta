
-- Força todos os usuários do tipo médico a trocarem a senha no próximo login
UPDATE public.usuarios 
SET deve_trocar_senha = true 
WHERE tipo = 'medico';

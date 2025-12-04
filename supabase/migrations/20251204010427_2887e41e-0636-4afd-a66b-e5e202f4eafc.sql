-- Criar usuário admin de teste
INSERT INTO public.usuarios (nome, email, senha_hash, tipo, ativo)
VALUES ('Administrador', 'admin@meconsulta.app.br', '123456', 'admin', true);
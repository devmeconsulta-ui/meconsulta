-- Add permissions array to usuarios_clinica
ALTER TABLE public.usuarios_clinica 
ADD COLUMN permissoes text[] DEFAULT ARRAY['dashboard', 'consultas', 'locais', 'agenda', 'pagina-publica'];
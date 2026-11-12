-- This migration must be coordinated with secure-auth and prontuario-fotos.
-- Custom login has no auth.uid(); only the authorized Edge Function may use
-- the image table/storage through its server-side service role.
CREATE TABLE public.prontuario_foto_sessoes (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  usuario_id uuid NOT NULL,
  origem text NOT NULL CHECK (origem IN ('usuarios', 'usuarios_clinica')),
  senha_fingerprint text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prontuario_foto_sessoes_expiry_idx ON public.prontuario_foto_sessoes(expires_at);
ALTER TABLE public.prontuario_foto_sessoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.prontuario_foto_sessoes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.prontuario_foto_sessoes TO service_role;


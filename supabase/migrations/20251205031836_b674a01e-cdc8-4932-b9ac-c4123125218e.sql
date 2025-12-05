-- Create config_asaas table for Asaas integration settings
CREATE TABLE public.config_asaas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente TEXT NOT NULL CHECK (ambiente IN ('sandbox', 'producao')),
  api_key TEXT NOT NULL,
  base_url TEXT NOT NULL,
  webhook_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create config_whatsapp table for WhatsApp integration settings
CREATE TABLE public.config_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_base_url TEXT,
  api_token TEXT,
  webhook_medico_url TEXT,
  webhook_paciente_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add telefone_whatsapp to medicos table if not exists
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS telefone_whatsapp TEXT;

-- Add asaas_invoice_url to consultas table if not exists
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.config_asaas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config_whatsapp ENABLE ROW LEVEL SECURITY;

-- Create policies for config_asaas (admin only)
CREATE POLICY "Admin can manage config_asaas"
ON public.config_asaas
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create policies for config_whatsapp (admin only)
CREATE POLICY "Admin can manage config_whatsapp"
ON public.config_whatsapp
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to update updated_at on config_asaas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_config_asaas_updated_at
BEFORE UPDATE ON public.config_asaas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_whatsapp_updated_at
BEFORE UPDATE ON public.config_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
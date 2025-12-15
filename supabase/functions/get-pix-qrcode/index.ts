import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();
    
    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching PIX QR Code for payment: ${payment_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch Asaas configuration
    const { data: asaasConfig, error: configError } = await supabase
      .from('config_asaas')
      .select('api_key, base_url, ambiente, ativo')
      .eq('ativo', true)
      .maybeSingle();

    if (configError || !asaasConfig) {
      console.error('Asaas config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do Asaas não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using Asaas ${asaasConfig.ambiente} environment`);

    // Fetch PIX QR Code from Asaas
    const pixResponse = await fetch(`${asaasConfig.base_url}/payments/${payment_id}/pixQrCode`, {
      headers: {
        'access_token': asaasConfig.api_key,
      },
    });

    if (!pixResponse.ok) {
      const errorText = await pixResponse.text();
      console.error('Asaas PIX QR Code error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar QR Code PIX', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixData = await pixResponse.json();
    console.log('PIX QR Code generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        pixData: {
          encodedImage: pixData.encodedImage,
          payload: pixData.payload,
          expirationDate: pixData.expirationDate,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-pix-qrcode:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const { consulta_id } = await req.json();
    
    if (!consulta_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'consulta_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cancelling payment for consulta: ${consulta_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get consulta with asaas_payment_id
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select('id, asaas_payment_id, status_consulta')
      .eq('id', consulta_id)
      .maybeSingle();

    if (consultaError || !consulta) {
      console.error('Consulta not found:', consultaError);
      return new Response(
        JSON.stringify({ success: false, error: 'Consulta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Update consulta status to cancelled
    const { error: updateError } = await supabase
      .from('consultas')
      .update({ 
        status_consulta: 'cancelada',
        status_pagamento: 'cancelado'
      })
      .eq('id', consulta_id);

    if (updateError) {
      console.error('Error updating consulta:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar consulta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. If has asaas_payment_id, cancel in Asaas
    if (consulta.asaas_payment_id) {
      // Get Asaas config
      const { data: asaasConfig, error: configError } = await supabase
        .from('config_asaas')
        .select('api_key, base_url')
        .eq('ativo', true)
        .maybeSingle();

      if (!configError && asaasConfig) {
        console.log(`Cancelling Asaas payment: ${consulta.asaas_payment_id}`);
        
        const cancelResponse = await fetch(
          `${asaasConfig.base_url}/payments/${consulta.asaas_payment_id}`,
          {
            method: 'DELETE',
            headers: {
              'access_token': asaasConfig.api_key,
            },
          }
        );

        if (cancelResponse.ok) {
          console.log('Asaas payment cancelled successfully');
        } else {
          const errorText = await cancelResponse.text();
          console.error('Failed to cancel Asaas payment:', cancelResponse.status, errorText);
          // Continue anyway - local cancellation was successful
        }
      }
    } else {
      console.log('No Asaas payment ID - skipping Asaas cancellation');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Consulta cancelada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cancel-asaas-payment:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

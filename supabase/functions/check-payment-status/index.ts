import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckPaymentRequest {
  consulta_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consulta_id } = await req.json() as CheckPaymentRequest;
    
    if (!consulta_id) {
      return new Response(
        JSON.stringify({ error: 'consulta_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking payment status for consulta: ${consulta_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Asaas configuration
    const { data: asaasConfig, error: configError } = await supabase
      .from('config_asaas')
      .select('api_key, base_url')
      .eq('ativo', true)
      .maybeSingle();

    if (configError || !asaasConfig) {
      console.error('Asaas config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do Asaas não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch consulta
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select('id, asaas_payment_id, status_pagamento, status_consulta')
      .eq('id', consulta_id)
      .maybeSingle();

    if (consultaError || !consulta) {
      console.error('Consulta error:', consultaError);
      return new Response(
        JSON.stringify({ error: 'Consulta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consulta.asaas_payment_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: false, 
          message: 'Consulta sem pagamento Asaas associado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check payment status in Asaas
    console.log(`Fetching payment ${consulta.asaas_payment_id} from Asaas...`);
    
    const paymentResponse = await fetch(
      `${asaasConfig.base_url}/payments/${consulta.asaas_payment_id}`,
      {
        headers: { 'access_token': asaasConfig.api_key },
      }
    );

    if (!paymentResponse.ok) {
      console.error('Asaas API error:', paymentResponse.status);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar Asaas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await paymentResponse.json();
    console.log(`Asaas payment status: ${paymentData.status}`);

    // 4. Map Asaas status to our status
    let newStatusPagamento = consulta.status_pagamento;
    let newStatusConsulta = consulta.status_consulta;

    switch (paymentData.status) {
      case 'CONFIRMED':
      case 'RECEIVED':
      case 'RECEIVED_IN_CASH':
        newStatusPagamento = 'pago';
        if (consulta.status_consulta === 'aguardando_pagamento') {
          newStatusConsulta = 'confirmada';
        }
        break;
      case 'OVERDUE':
        newStatusPagamento = 'vencido';
        break;
      case 'REFUNDED':
      case 'REFUND_REQUESTED':
      case 'CHARGEBACK_REQUESTED':
      case 'CHARGEBACK_DISPUTE':
      case 'AWAITING_CHARGEBACK_REVERSAL':
        newStatusPagamento = 'estornado';
        break;
      case 'DELETED':
        newStatusPagamento = 'cancelado';
        newStatusConsulta = 'cancelada';
        break;
    }

    // 5. Update if changed
    if (newStatusPagamento !== consulta.status_pagamento || newStatusConsulta !== consulta.status_consulta) {
      console.log(`Updating consulta: ${newStatusPagamento} / ${newStatusConsulta}`);
      
      const { error: updateError } = await supabase
        .from('consultas')
        .update({
          status_pagamento: newStatusPagamento,
          status_consulta: newStatusConsulta,
        })
        .eq('id', consulta.id);

      if (updateError) {
        console.error('Update error:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: true,
          status_pagamento: newStatusPagamento,
          status_consulta: newStatusConsulta,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: false,
        status_pagamento: consulta.status_pagamento,
        status_consulta: consulta.status_consulta,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

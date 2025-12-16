import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { consulta_id } = await req.json();

    if (!consulta_id) {
      return new Response(
        JSON.stringify({ error: 'consulta_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados da consulta
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select('*')
      .eq('id', consulta_id)
      .single();

    if (consultaError || !consulta) {
      console.error('Erro ao buscar consulta:', consultaError);
      return new Response(
        JSON.stringify({ error: 'Consulta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o pagamento já foi feito
    if (consulta.status_pagamento !== 'pago') {
      console.log('Consulta não está paga, não há estorno a fazer');
      return new Response(
        JSON.stringify({ message: 'Consulta não está paga, estorno não necessário', refunded: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consulta.asaas_payment_id) {
      console.log('Consulta não possui payment_id do Asaas');
      return new Response(
        JSON.stringify({ error: 'Consulta não possui ID de pagamento Asaas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar configuração do Asaas
    const { data: configAsaas, error: configError } = await supabase
      .from('config_asaas')
      .select('*')
      .eq('ativo', true)
      .single();

    if (configError || !configAsaas) {
      console.error('Erro ao buscar config Asaas:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração Asaas não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Realizar estorno no Asaas
    console.log(`Realizando estorno do pagamento ${consulta.asaas_payment_id}`);
    
    const refundResponse = await fetch(
      `${configAsaas.base_url}/payments/${consulta.asaas_payment_id}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': configAsaas.api_key,
        },
        body: JSON.stringify({
          value: consulta.valor_consulta,
          description: `Estorno da consulta ${consulta_id}`,
        }),
      }
    );

    const refundData = await refundResponse.json();
    console.log('Resposta do estorno Asaas:', refundData);

    if (!refundResponse.ok) {
      console.error('Erro ao estornar pagamento:', refundData);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar estorno no Asaas', details: refundData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar consulta com status de estorno
    const { error: updateError } = await supabase
      .from('consultas')
      .update({
        status_pagamento: 'estornado',
        status_consulta: 'cancelada',
      })
      .eq('id', consulta_id);

    if (updateError) {
      console.error('Erro ao atualizar consulta:', updateError);
    }

    // Liberar slot da agenda se existir
    if (consulta.agenda_slot_id) {
      await supabase
        .from('agenda_slots')
        .update({ disponivel: true })
        .eq('id', consulta.agenda_slot_id);
    }

    // Registrar evento
    await supabase
      .from('consultas_eventos')
      .insert({
        consulta_id: consulta_id,
        tipo_evento: 'estorno',
        descricao: `Estorno realizado no valor de R$ ${consulta.valor_consulta}`,
        usuario_tipo: 'sistema',
      });

    console.log('Estorno realizado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estorno realizado com sucesso',
        refunded: true,
        refund_id: refundData.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no estorno:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

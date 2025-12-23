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

    // 1. Get consulta with asaas_payment_id and agenda_slot_id
    const { data: consulta, error: consultaError } = await supabase
      .from('consultas')
      .select('id, asaas_payment_id, status_consulta, status_pagamento, agenda_slot_id, medico_id, data_hora, valor_consulta')
      .eq('id', consulta_id)
      .maybeSingle();

    if (consultaError || !consulta) {
      console.error('Consulta not found:', consultaError);
      return new Response(
        JSON.stringify({ success: false, error: 'Consulta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found consulta:`, JSON.stringify(consulta));

    // 2. Check if refund is allowed (48 hours before consultation)
    const consultaDate = new Date(consulta.data_hora);
    const now = new Date();
    const hoursUntilConsulta = (consultaDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    console.log(`Hours until consulta: ${hoursUntilConsulta}`);
    
    // Se o pagamento foi feito e faltam menos de 48 horas, não permitir estorno
    if (consulta.status_pagamento === 'pago' && hoursUntilConsulta < 48) {
      console.log('Refund not allowed - less than 48 hours until consultation');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não é possível cancelar com estorno. O cancelamento com reembolso só é permitido até 48 horas antes da consulta.',
          hours_until_consulta: Math.floor(hoursUntilConsulta)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Cancel or Refund in Asaas FIRST (before updating local status)
    if (consulta.asaas_payment_id) {
      // Get Asaas config
      const { data: asaasConfig, error: configError } = await supabase
        .from('config_asaas')
        .select('api_key, base_url')
        .eq('ativo', true)
        .maybeSingle();

      if (!configError && asaasConfig) {
        // Se o pagamento já foi feito e faltam mais de 48h, fazer estorno
        if (consulta.status_pagamento === 'pago') {
          console.log(`Payment already paid - requesting refund for: ${consulta.asaas_payment_id}`);
          
          try {
            const refundResponse = await fetch(
              `${asaasConfig.base_url}/payments/${consulta.asaas_payment_id}/refund`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'access_token': asaasConfig.api_key,
                },
                body: JSON.stringify({
                  value: consulta.valor_consulta,
                  description: `Estorno da consulta ${consulta_id} - Cancelamento`,
                }),
              }
            );

            const refundData = await refundResponse.json();
            console.log(`Refund response status: ${refundResponse.status}, body: ${JSON.stringify(refundData)}`);

            if (refundResponse.ok) {
              console.log('Asaas payment refunded successfully');
            } else {
              console.error('Failed to refund Asaas payment:', refundResponse.status, refundData);
            }
          } catch (refundError) {
            console.error('Error calling Asaas refund API:', refundError);
          }
        } else {
          // Se não foi pago, apenas cancelar
          console.log(`Cancelling unpaid Asaas payment: ${consulta.asaas_payment_id}`);
          
          try {
            const cancelResponse = await fetch(
              `${asaasConfig.base_url}/payments/${consulta.asaas_payment_id}`,
              {
                method: 'DELETE',
                headers: {
                  'access_token': asaasConfig.api_key,
                },
              }
            );

            const responseText = await cancelResponse.text();
            console.log(`Asaas cancel response status: ${cancelResponse.status}, body: ${responseText}`);

            if (cancelResponse.ok) {
              console.log('Asaas payment cancelled successfully');
            } else {
              console.error('Failed to cancel Asaas payment:', cancelResponse.status, responseText);
            }
          } catch (asaasError) {
            console.error('Error calling Asaas cancel API:', asaasError);
          }
        }
      } else {
        console.log('No active Asaas config found');
      }
    } else {
      console.log('No Asaas payment ID - skipping Asaas cancellation');
    }

    // 4. Update consulta status to cancelled (estornado se foi pago)
    const newPaymentStatus = consulta.status_pagamento === 'pago' ? 'estornado' : 'cancelado';
    const { error: updateError } = await supabase
      .from('consultas')
      .update({ 
        status_consulta: 'cancelada',
        status_pagamento: newPaymentStatus
      })
      .eq('id', consulta_id);

    if (updateError) {
      console.error('Error updating consulta:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar consulta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Consulta status updated to cancelada');

    // 5. Reopen the agenda slot
    if (consulta.agenda_slot_id) {
      console.log(`Reopening agenda slot: ${consulta.agenda_slot_id}`);
      const { error: slotError } = await supabase
        .from('agenda_slots')
        .update({ disponivel: true })
        .eq('id', consulta.agenda_slot_id);
      
      if (slotError) {
        console.error('Error reopening slot by ID:', slotError);
      } else {
        console.log('Agenda slot reopened successfully');
      }
    } else if (consulta.medico_id && consulta.data_hora) {
      // Try to find and reopen by medico_id + data_hora
      console.log(`Trying to reopen slot by medico_id + data_hora: ${consulta.medico_id}, ${consulta.data_hora}`);
      const { error: slotError } = await supabase
        .from('agenda_slots')
        .update({ disponivel: true })
        .eq('medico_id', consulta.medico_id)
        .eq('data_hora', consulta.data_hora);
      
      if (slotError) {
        console.error('Error reopening slot by medico/data:', slotError);
      } else {
        console.log('Agenda slot reopened by medico/data');
      }
    } else {
      console.log('No agenda_slot_id or medico_id/data_hora to reopen slot');
    }

    // 6. Log the event
    const eventDescription = consulta.status_pagamento === 'pago' 
      ? 'Consulta cancelada com estorno (mais de 48h antes)' 
      : 'Consulta cancelada pelo paciente';
    
    await supabase.from('consultas_eventos').insert({
      consulta_id: consulta_id,
      tipo_evento: 'cancelada',
      descricao: eventDescription,
      usuario_tipo: 'paciente',
    });

    console.log('Cancellation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Consulta cancelada com sucesso',
        refunded: consulta.status_pagamento === 'pago'
      }),
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

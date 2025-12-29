import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    customer: string;
    value: number;
    netValue: number;
    status: string;
    billingType: string;
    externalReference?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    confirmedDate?: string;
    paymentDate?: string;
  };
  transfer?: {
    id: string;
    value: number;
    status: string;
    transferFee: number;
    effectiveDate?: string;
    externalReference?: string;
  };
}

// Function to trigger automatic transfer to doctor/clinic
async function triggerAutomaticTransfer(consultaId: string, supabaseUrl: string, supabaseServiceKey: string) {
  try {
    console.log(`Triggering automatic transfer for consulta ${consultaId}`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/transfer-to-doctor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ consulta_id: consultaId }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error(`Transfer failed for consulta ${consultaId}:`, result);
      return { success: false, error: result.error || 'Transfer failed' };
    }

    console.log(`Transfer successful for consulta ${consultaId}:`, result);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error triggering transfer for consulta ${consultaId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: AsaasWebhookPayload = await req.json();
    
    console.log("=== ASAAS WEBHOOK RECEIVED ===");
    console.log("Event:", payload.event);
    console.log("Full payload:", JSON.stringify(payload, null, 2));

    const { event, payment, transfer } = payload;

    // Handle transfer events
    if (event.startsWith("TRANSFER_")) {
      console.log(`Transfer event received: ${event}`, transfer);
      
      if (transfer?.externalReference) {
        // Log the transfer event
        await supabase.from("consultas_eventos").insert({
          consulta_id: transfer.externalReference,
          tipo_evento: `asaas_${event.toLowerCase()}`,
          descricao: `Evento de transferência Asaas: ${event} - Valor: R$ ${transfer.value?.toFixed(2) || '0.00'}`,
          usuario_tipo: "sistema",
        });
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Transfer event processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle payment events
    if (!payment) {
      console.log("No payment data in webhook");
      return new Response(
        JSON.stringify({ success: true, message: "No payment data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the consultation by externalReference (consulta ID) or asaas_payment_id
    let consultaQuery = supabase.from("consultas").select("id, status_pagamento, status_consulta, origem, elegivel_repasse, medico_id");
    
    if (payment.externalReference) {
      consultaQuery = consultaQuery.eq("id", payment.externalReference);
    } else {
      consultaQuery = consultaQuery.eq("asaas_payment_id", payment.id);
    }

    const { data: consulta, error: consultaError } = await consultaQuery.maybeSingle();

    if (consultaError) {
      console.error("Error finding consulta:", consultaError);
      return new Response(
        JSON.stringify({ success: false, error: "Error finding consulta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!consulta) {
      console.log("Consulta not found for payment:", payment.id);
      return new Response(
        JSON.stringify({ success: true, message: "Consulta not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found consulta ${consulta.id} with status_pagamento=${consulta.status_pagamento}, origem=${consulta.origem}`);

    // Map Asaas payment status to our status
    let newStatusPagamento = consulta.status_pagamento;
    let newStatusConsulta = consulta.status_consulta;
    let shouldTriggerTransfer = false;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        newStatusPagamento = "pago";
        newStatusConsulta = "confirmada";
        // Trigger automatic transfer for online consultations
        if (consulta.origem === "online") {
          shouldTriggerTransfer = true;
        }
        console.log(`Payment confirmed for consulta ${consulta.id}, shouldTriggerTransfer=${shouldTriggerTransfer}`);
        break;
      
      case "PAYMENT_OVERDUE":
        newStatusPagamento = "vencido";
        console.log(`Payment overdue for consulta ${consulta.id}`);
        break;
      
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        newStatusPagamento = "estornado";
        newStatusConsulta = "cancelada";
        console.log(`Payment refunded/deleted for consulta ${consulta.id}`);
        
        // Free up the agenda slot
        const { data: consultaData } = await supabase
          .from("consultas")
          .select("agenda_slot_id")
          .eq("id", consulta.id)
          .single();
          
        if (consultaData?.agenda_slot_id) {
          await supabase
            .from("agenda_slots")
            .update({ disponivel: true })
            .eq("id", consultaData.agenda_slot_id);
          console.log(`Freed agenda slot ${consultaData.agenda_slot_id}`);
        }
        break;
      
      case "PAYMENT_CREATED":
      case "PAYMENT_UPDATED":
        console.log(`Payment ${event.toLowerCase()} for consulta ${consulta.id}`);
        break;
      
      default:
        console.log(`Unhandled event: ${event}`);
    }

    // Update the consultation if status changed
    if (newStatusPagamento !== consulta.status_pagamento || newStatusConsulta !== consulta.status_consulta) {
      const updateData: Record<string, unknown> = {
        status_pagamento: newStatusPagamento,
        status_consulta: newStatusConsulta,
      };
      
      // Mark as eligible for transfer when payment is confirmed
      if (shouldTriggerTransfer && !consulta.elegivel_repasse) {
        updateData.elegivel_repasse = true;
      }

      const { error: updateError } = await supabase
        .from("consultas")
        .update(updateData)
        .eq("id", consulta.id);

      if (updateError) {
        console.error("Error updating consulta:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Error updating consulta" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Consulta ${consulta.id} updated: status_pagamento=${newStatusPagamento}, status_consulta=${newStatusConsulta}`);

      // Log the event
      await supabase.from("consultas_eventos").insert({
        consulta_id: consulta.id,
        tipo_evento: `asaas_${event.toLowerCase()}`,
        descricao: `Webhook Asaas: ${event} - Status atualizado para ${newStatusPagamento}/${newStatusConsulta}`,
        usuario_tipo: "sistema",
      });
    }

    // Trigger automatic transfer if applicable
    if (shouldTriggerTransfer) {
      const transferResult = await triggerAutomaticTransfer(consulta.id, supabaseUrl, supabaseServiceKey);
      
      // Log transfer attempt
      await supabase.from("consultas_eventos").insert({
        consulta_id: consulta.id,
        tipo_evento: transferResult.success ? "repasse_automatico_iniciado" : "repasse_automatico_falhou",
        descricao: transferResult.success 
          ? "Repasse automático iniciado após confirmação de pagamento"
          : `Falha no repasse automático: ${transferResult.error}`,
        usuario_tipo: "sistema",
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed",
        consultaId: consulta.id,
        statusUpdated: newStatusPagamento !== consulta.status_pagamento,
        transferTriggered: shouldTriggerTransfer
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

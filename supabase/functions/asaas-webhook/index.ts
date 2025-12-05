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
    
    console.log("Asaas webhook received:", JSON.stringify(payload, null, 2));

    const { event, payment } = payload;

    if (!payment) {
      console.log("No payment data in webhook");
      return new Response(
        JSON.stringify({ success: true, message: "No payment data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the consultation by externalReference (consulta ID) or asaas_payment_id
    let consultaQuery = supabase.from("consultas").select("id, status_pagamento, status_consulta");
    
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

    // Map Asaas payment status to our status
    let newStatusPagamento = consulta.status_pagamento;
    let newStatusConsulta = consulta.status_consulta;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        newStatusPagamento = "pago";
        newStatusConsulta = "confirmada";
        console.log(`Payment confirmed for consulta ${consulta.id}`);
        break;
      
      case "PAYMENT_OVERDUE":
        newStatusPagamento = "vencido";
        console.log(`Payment overdue for consulta ${consulta.id}`);
        break;
      
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        newStatusPagamento = "cancelado";
        newStatusConsulta = "cancelada";
        console.log(`Payment cancelled/refunded for consulta ${consulta.id}`);
        break;
      
      case "PAYMENT_CREATED":
      case "PAYMENT_UPDATED":
        // Just log, don't change status
        console.log(`Payment ${event.toLowerCase()} for consulta ${consulta.id}`);
        break;
      
      default:
        console.log(`Unhandled event: ${event}`);
    }

    // Update the consultation if status changed
    if (newStatusPagamento !== consulta.status_pagamento || newStatusConsulta !== consulta.status_consulta) {
      const { error: updateError } = await supabase
        .from("consultas")
        .update({
          status_pagamento: newStatusPagamento,
          status_consulta: newStatusConsulta,
        })
        .eq("id", consulta.id);

      if (updateError) {
        console.error("Error updating consulta:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Error updating consulta" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Consulta ${consulta.id} updated: status_pagamento=${newStatusPagamento}, status_consulta=${newStatusConsulta}`);
    }

    // TODO: Future - Trigger WhatsApp notifications here when integration is ready
    // This is where we would call the WhatsApp webhook to notify patient and doctor
    // about the payment confirmation

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
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

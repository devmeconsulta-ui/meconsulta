import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Running auto-cancel check for unpaid online consultations...");

    // Find consultations older than 15 minutes that are still pending payment
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: consultasToCancel, error: fetchError } = await supabase
      .from("consultas")
      .select("id, agenda_slot_id, medico_id, data_hora")
      .eq("origem", "online")
      .eq("status_pagamento", "pendente")
      .eq("status_consulta", "aguardando_pagamento")
      .lt("created_at", fifteenMinutesAgo);

    if (fetchError) {
      console.error("Error fetching consultations:", fetchError);
      throw fetchError;
    }

    if (!consultasToCancel || consultasToCancel.length === 0) {
      console.log("No consultations to cancel");
      return new Response(
        JSON.stringify({ message: "No consultations to cancel", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${consultasToCancel.length} consultations to cancel`);

    let canceledCount = 0;

    for (const consulta of consultasToCancel) {
      // Update consultation status
      const { error: updateError } = await supabase
        .from("consultas")
        .update({
          status_consulta: "cancelada",
          status_pagamento: "cancelado",
        })
        .eq("id", consulta.id);

      if (updateError) {
        console.error(`Error canceling consultation ${consulta.id}:`, updateError);
        continue;
      }

      // Reopen the slot if we have the slot ID
      if (consulta.agenda_slot_id) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .eq("id", consulta.agenda_slot_id);
      } else if (consulta.medico_id && consulta.data_hora) {
        // Try to find and reopen by medico_id + data_hora
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .eq("medico_id", consulta.medico_id)
          .eq("data_hora", consulta.data_hora);
      }

      canceledCount++;
      console.log(`Canceled consultation ${consulta.id}`);
    }

    return new Response(
      JSON.stringify({ 
        message: `Canceled ${canceledCount} unpaid consultations`,
        count: canceledCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in auto-cancel function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

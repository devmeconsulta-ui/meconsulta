import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1}/${retries} failed:`, error instanceof Error ? error.message : error);
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  throw new Error("All retry attempts failed");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

    if (!EVO_URL) {
      return new Response(
        JSON.stringify({ success: false, reason: "evolution_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clinica_id, paciente_nome, paciente_telefone, data_hora, medico_nome, local_nome } = await req.json();

    if (!clinica_id || !paciente_telefone || !data_hora) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar primeira fila ativa com instância Evolution conectada
    const { data: fila, error: filaError } = await supabase
      .from("omni_filas")
      .select(`*, instancia:omni_instancias(*)`)
      .eq("clinica_id", clinica_id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const instancia = fila?.instancia as any;
    if (filaError || !instancia?.zapi_instance_id) {
      console.log("Nenhuma instância WhatsApp ativa para a clínica", clinica_id);
      return new Response(
        JSON.stringify({ success: false, reason: "no_whatsapp_instance" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar telefone
    let telefone = paciente_telefone.replace(/\D/g, "");
    if (!telefone.startsWith("55")) telefone = "55" + telefone;

    // Formatar data/hora
    const dataHora = new Date(data_hora);
    const dataFormatada = dataHora.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const mensagem = `Olá ${paciente_nome || ""}! 🏥\n\nSeu horário foi reservado com sucesso:\n\n📅 *Data:* ${dataFormatada}\n🕐 *Horário:* ${horaFormatada}\n👨‍⚕️ *Médico(a):* Dr(a). ${medico_nome || ""}${local_nome ? `\n📍 *Local:* ${local_nome}` : ""}\n\nEm caso de dúvidas, entre em contato conosco.\nObrigado! 😊`;

    const resp = await fetchWithRetry(
      `${EVO_URL}/message/sendText/${instancia.zapi_instance_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: instancia.zapi_token || EVO_KEY,
        },
        body: JSON.stringify({ number: telefone, text: mensagem }),
      },
      3, 800
    );

    const result = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error("Erro ao enviar notificação Evolution:", result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || "Erro ao enviar" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Notificação de agendamento enviada via Evolution para`, telefone);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro no notify-appointment-booked:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

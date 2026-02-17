import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(
        JSON.stringify({ success: false, reason: "evolution_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { clinica_id } = await req.json();

    if (!clinica_id) {
      return new Response(
        JSON.stringify({ success: false, error: "clinica_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar instância WhatsApp da clínica
    const { data: fila } = await supabase
      .from("omni_filas")
      .select(`*, instancia:omni_instancias(*)`)
      .eq("clinica_id", clinica_id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!fila?.instancia?.evolution_instance_name) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_whatsapp_instance" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = fila.instancia.evolution_instance_name;
    console.log("Using instance:", instanceName);

    // Buscar pacientes sem foto que têm telefone
    const { data: pacientes } = await supabase
      .from("pacientes")
      .select("id, telefone, nome")
      .is("foto_url", null)
      .not("telefone", "is", null)
      .neq("telefone", "")
      .limit(10);

    if (!pacientes || pacientes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "Nenhum paciente sem foto encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pacientes.length} pacientes`);

    let updated = 0;
    let errors = 0;

    for (const paciente of pacientes) {
      try {
        let telefone = paciente.telefone.replace(/\D/g, "");
        if (!telefone || telefone.length < 10) continue;
        if (!telefone.startsWith("55")) {
          telefone = "55" + telefone;
        }

        console.log(`Fetching photo for ${paciente.nome} (${telefone})`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const profilePicResponse = await fetch(
          `${evolutionApiUrl}/chat/fetchProfilePictureUrl/${instanceName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionApiKey,
            },
            body: JSON.stringify({ number: telefone }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (profilePicResponse.ok) {
          const profileData = await profilePicResponse.json();
          const profilePictureUrl = profileData?.profilePictureUrl;
          console.log(`Photo result for ${paciente.nome}:`, profilePictureUrl ? "found" : "not found");

          if (profilePictureUrl) {
            await supabase
              .from("pacientes")
              .update({ foto_url: profilePictureUrl })
              .eq("id", paciente.id);
            updated++;
          }
        } else {
          console.log(`Photo fetch failed for ${paciente.nome}: ${profilePicResponse.status}`);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e: any) {
        console.log(`Erro foto ${paciente.nome}:`, e.message || e);
        errors++;
      }
    }

    // Cross-reference: copiar fotos de omni_contatos para pacientes com mesmo telefone
    const { data: contatosComFoto } = await supabase
      .from("omni_contatos")
      .select("telefone, foto_url")
      .not("foto_url", "is", null)
      .not("telefone", "is", null);

    if (contatosComFoto && contatosComFoto.length > 0) {
      // Buscar pacientes sem foto novamente
      const { data: pacientesSemFoto } = await supabase
        .from("pacientes")
        .select("id, telefone")
        .is("foto_url", null)
        .not("telefone", "is", null);

      if (pacientesSemFoto) {
        // Build phone -> foto_url map from contatos
        const fotoMap = new Map<string, string>();
        for (const c of contatosComFoto) {
          const cleanPhone = c.telefone.replace(/\D/g, "");
          // Store with and without 55 prefix
          fotoMap.set(cleanPhone, c.foto_url);
          if (cleanPhone.startsWith("55")) {
            fotoMap.set(cleanPhone.slice(2), c.foto_url);
          } else {
            fotoMap.set("55" + cleanPhone, c.foto_url);
          }
        }

        for (const p of pacientesSemFoto) {
          const cleanPhone = p.telefone.replace(/\D/g, "");
          const foto = fotoMap.get(cleanPhone);
          if (foto) {
            await supabase
              .from("pacientes")
              .update({ foto_url: foto })
              .eq("id", p.id);
            updated++;
            console.log(`Cross-ref foto for paciente ${p.id}`);
          }
        }
      }
    }

    console.log(`Done: ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pacientes_updated: updated,
        total_processed: pacientes.length,
        errors 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro no sync-whatsapp-photos:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

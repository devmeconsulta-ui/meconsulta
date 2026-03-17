import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_BASE = "https://api.z-api.io";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
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
    const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { clinica_id } = await req.json();

    if (!clinica_id) {
      return new Response(
        JSON.stringify({ success: false, error: "clinica_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ZAPI_CLIENT_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, reason: "zapi_not_configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find a connected WhatsApp instance for this clinic
    const { data: fila } = await supabase
      .from("omni_filas")
      .select(`*, instancia:omni_instancias(*)`)
      .eq("clinica_id", clinica_id)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    const instancia = fila?.instancia as any;
    if (!instancia?.zapi_instance_id || !instancia?.zapi_token) {
      return new Response(
        JSON.stringify({ success: false, reason: "no_whatsapp_instance" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using Z-API instance: ${instancia.id}`);

    // ── Sync omni_contatos photos first ──
    const { data: contatosSemFoto } = await supabase
      .from("omni_contatos")
      .select("id, telefone, nome")
      .eq("clinica_id", clinica_id)
      .is("foto_url", null)
      .not("telefone", "is", null)
      .neq("telefone", "")
      .neq("telefone", "+")
      .limit(20);

    let contatosUpdated = 0;
    if (contatosSemFoto && contatosSemFoto.length > 0) {
      console.log(`Processing ${contatosSemFoto.length} contatos without photos`);
      for (const contato of contatosSemFoto) {
        try {
          let telefone = contato.telefone.replace(/\D/g, "");
          if (!telefone || telefone.length < 10) continue;
          if (!telefone.startsWith("55")) telefone = "55" + telefone;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          try {
            const response = await fetchWithRetry(
              `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/profile-picture/${telefone}`,
              { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN }, signal: controller.signal },
              2, 800
            );
            clearTimeout(timeoutId);
            if (response.ok) {
              const data = await response.json();
              const profilePictureUrl = data.link || data.profilePictureUrl || data.imgUrl || null;
              if (profilePictureUrl) {
                await supabase.from("omni_contatos").update({ foto_url: profilePictureUrl }).eq("id", contato.id);
                contatosUpdated++;
                console.log(`Photo updated for contato ${contato.nome}`);
              }
            }
          } catch (e) {
            clearTimeout(timeoutId);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e: any) {
          console.log(`Erro foto contato ${contato.nome}:`, e.message || e);
        }
      }
    }

    // ── Sync pacientes photos ──
    // Fetch patients without photos
    const { data: pacientes } = await supabase
      .from("pacientes")
      .select("id, telefone, nome")
      .is("foto_url", null)
      .not("telefone", "is", null)
      .neq("telefone", "")
      .limit(10);

    if (!pacientes || pacientes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, contatos_updated: contatosUpdated, pacientes_updated: 0, message: "Nenhum paciente sem foto encontrado" }),
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
        try {
          const response = await fetchWithRetry(
            `${ZAPI_BASE}/instances/${instancia.zapi_instance_id}/token/${instancia.zapi_token}/profile-picture/${telefone}`,
            { method: "GET", headers: { "Client-Token": ZAPI_CLIENT_TOKEN }, signal: controller.signal },
            2, 800
          );
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            const profilePictureUrl = data.link || data.profilePictureUrl || data.imgUrl || null;
            if (profilePictureUrl) {
              await supabase.from("pacientes").update({ foto_url: profilePictureUrl }).eq("id", paciente.id);
              updated++;
              console.log(`Photo updated for ${paciente.nome}`);
            }
          }
        } catch (e) {
          clearTimeout(timeoutId);
          console.log(`Z-API photo fetch failed for ${paciente.nome}:`, e instanceof Error ? e.message : e);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e: any) {
        console.log(`Erro foto ${paciente.nome}:`, e.message || e);
        errors++;
      }
    }

    // Cross-reference: copy photos from omni_contatos to pacientes with same phone
    const { data: contatosComFoto } = await supabase
      .from("omni_contatos")
      .select("telefone, foto_url")
      .not("foto_url", "is", null)
      .not("telefone", "is", null);

    if (contatosComFoto && contatosComFoto.length > 0) {
      const { data: pacientesSemFoto } = await supabase
        .from("pacientes")
        .select("id, telefone")
        .is("foto_url", null)
        .not("telefone", "is", null);

      if (pacientesSemFoto) {
        const fotoMap = new Map<string, string>();
        for (const c of contatosComFoto) {
          const cleanPhone = c.telefone.replace(/\D/g, "");
          fotoMap.set(cleanPhone, c.foto_url);
          if (cleanPhone.startsWith("55")) fotoMap.set(cleanPhone.slice(2), c.foto_url);
          else fotoMap.set("55" + cleanPhone, c.foto_url);
        }

        for (const p of pacientesSemFoto) {
          const cleanPhone = p.telefone.replace(/\D/g, "");
          const foto = fotoMap.get(cleanPhone);
          if (foto) {
            await supabase.from("pacientes").update({ foto_url: foto }).eq("id", p.id);
            updated++;
            console.log(`Cross-ref foto for paciente ${p.id}`);
          }
        }
      }
    }

    console.log(`Done: ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, pacientes_updated: updated, total_processed: pacientes.length, errors }),
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

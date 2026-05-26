// Evolution API v2 — Send Text / Media / Audio
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function onlyDigits(p: string) { return (p || "").replace(/\D/g, ""); }

function detectMediaType(mime?: string | null, url?: string | null): "image" | "video" | "audio" | "document" {
  const m = (mime || "").toLowerCase();
  const u = (url || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(u)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov|avi|mkv)$/.test(u)) return "video";
  if (m.startsWith("audio/") || /\.(ogg|opus|mp3|wav|m4a|aac)$/.test(u)) return "audio";
  return "document";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const EVO_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const {
      atendimento_id,
      agente_id,
      tipo,           // texto|imagem|audio|video|documento|nota_interna
      conteudo,
      arquivo_url,
      arquivo_nome,
      arquivo_tipo,
      encaminhada,
    } = body;

    if (!atendimento_id) {
      return new Response(JSON.stringify({ error: "atendimento_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Nota interna: só persiste no banco
    if (tipo === "nota_interna") {
      const { data: msg, error } = await supabase.from("omni_mensagens").insert({
        atendimento_id, agente_id, direcao: "saida", tipo: "nota_interna", conteudo,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: msg }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve atendimento → contato + instância
    const { data: at, error: atErr } = await supabase
      .from("omni_atendimentos")
      .select("id, clinica_id, contato_id, instance_id, contato:omni_contatos!contato_id(telefone, nome)")
      .eq("id", atendimento_id)
      .single();

    if (atErr || !at) {
      return new Response(JSON.stringify({ error: "Atendimento não encontrado", details: atErr?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Escolhe instância: do atendimento ou primeira online da clínica
    let instance = null as any;
    if (at.instance_id) {
      const { data } = await supabase.from("managed_instances").select("*").eq("id", at.instance_id).single();
      instance = data;
    }
    if (!instance || instance.provider !== "evolution") {
      const { data } = await supabase
        .from("managed_instances")
        .select("*")
        .eq("clinica_id", at.clinica_id)
        .eq("provider", "evolution")
        .eq("status", "online")
        .limit(1)
        .maybeSingle();
      instance = data;
    }

    if (!instance?.evolution_instance_name) {
      return new Response(JSON.stringify({ error: "Nenhuma instância Evolution online disponível" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const name = instance.evolution_instance_name;
    const key = instance.evolution_api_key || EVO_KEY || "";
    const phone = onlyDigits((at.contato as any)?.telefone || "");

    if (!phone) {
      return new Response(JSON.stringify({ error: "Telefone do contato vazio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let endpoint = "";
    let payload: Record<string, any> = {};
    const mediaKind = arquivo_url ? detectMediaType(arquivo_tipo, arquivo_url) : null;

    if (tipo === "audio" || mediaKind === "audio") {
      endpoint = `${EVO_URL}/message/sendWhatsAppAudio/${name}`;
      payload = { number: phone, audio: arquivo_url, delay: 1000 };
    } else if (mediaKind && mediaKind !== "audio") {
      endpoint = `${EVO_URL}/message/sendMedia/${name}`;
      payload = {
        number: phone,
        mediatype: mediaKind,
        media: arquivo_url,
        fileName: arquivo_nome || `arquivo.${mediaKind === "image" ? "jpg" : mediaKind === "video" ? "mp4" : "bin"}`,
        caption: conteudo || "",
      };
    } else {
      endpoint = `${EVO_URL}/message/sendText/${name}`;
      payload = { number: phone, text: conteudo || "" };
    }

    console.log("[evolution-v2-send] →", endpoint, JSON.stringify(payload).slice(0, 300));

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify(payload),
    });
    const respData = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error("[evolution-v2-send] failed:", respData);
      return new Response(JSON.stringify({ error: "Falha ao enviar", details: respData }),
        { status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const whatsappId = respData?.key?.id || respData?.messageId || null;

    // Persiste mensagem como saída
    const { data: saved, error: insErr } = await supabase.from("omni_mensagens").insert({
      atendimento_id,
      contato_id: at.contato_id,
      agente_id,
      direcao: "saida",
      tipo: tipo || (mediaKind ?? "texto"),
      conteudo: conteudo || "",
      arquivo_url: arquivo_url || null,
      arquivo_nome: arquivo_nome || null,
      arquivo_tipo: arquivo_tipo || null,
      whatsapp_message_id: whatsappId,
      status_entrega: "sent",
      encaminhada: !!encaminhada,
    }).select().single();

    if (insErr) console.error("[evolution-v2-send] db insert error:", insErr);

    return new Response(JSON.stringify({ success: true, message: saved, evolution: respData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evolution-v2-send] fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

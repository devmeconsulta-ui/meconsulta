import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  consulta_id: string;
  clinica_id: string;
  mensagem_template: string;
  base_url: string;
  ordem_chegada?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { consulta_id, clinica_id, mensagem_template, base_url, ordem_chegada = false } =
      (await req.json()) as Body;

    if (!consulta_id || !clinica_id || !mensagem_template || !base_url) {
      throw new Error("consulta_id, clinica_id, mensagem_template e base_url são obrigatórios");
    }

    const { data: consulta, error: cErr } = await supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        paciente:pacientes!consultas_paciente_id_fkey(id, nome, telefone),
        medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
        local:locais_atendimento!consultas_local_id_fkey(id, nome_local, endereco, cidade, estado)
      `)
      .eq("id", consulta_id)
      .single();

    if (cErr || !consulta) throw new Error(`Consulta não encontrada: ${cErr?.message}`);

    const paciente = consulta.paciente as any;
    const medico = consulta.medico as any;
    const local = consulta.local as any;

    if (!paciente?.telefone) throw new Error("Paciente sem telefone cadastrado");

    // Verificar se já existe confirmação pendente/enviada/confirmada
    const { data: existente } = await supabase
      .from("confirmacoes_agenda")
      .select("id, token_confirmacao, link_confirmacao, mensagem_enviada, telefone, status")
      .eq("consulta_id", consulta_id)
      .in("status", ["pendente", "enviada", "confirmada", "agendada"])
      .maybeSingle();

    let token: string;
    let linkConfirmacao: string;
    let mensagem: string;

    const dataHora = new Date(consulta.data_hora);
    const dataFormatada = dataHora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const horaFormatada = dataHora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const endereco = local
      ? `${local.nome_local}${local.endereco ? ` - ${local.endereco}` : ""}${local.cidade ? `, ${local.cidade}` : ""}${local.estado ? `/${local.estado}` : ""}`
      : "A confirmar";

    if (existente) {
      token = existente.token_confirmacao;
      linkConfirmacao = existente.link_confirmacao || `${base_url}/confirmar-consulta/${token}`;
      mensagem = existente.mensagem_enviada || "";
    } else {
      token = crypto.randomUUID();
      linkConfirmacao = `${base_url}/confirmar-consulta/${token}`;
    }

    // (Re)gerar mensagem sempre com template atual para o compartilhamento manual
    mensagem = mensagem_template
      .replace(/{{nome_paciente}}/g, paciente.nome || "")
      .replace(/{{nome_medico}}/g, medico?.nome || "")
      .replace(/{{especialidade}}/g, medico?.especialidade || "")
      .replace(/{{data}}/g, dataFormatada)
      .replace(/{{horario}}/g, horaFormatada)
      .replace(/{{local}}/g, endereco)
      .replace(/{{link_confirmacao}}/g, linkConfirmacao);

    if (ordem_chegada && !mensagem.includes("ordem de chegada")) {
      mensagem += `\n\n⚠️ *Atenção:* O atendimento neste horário será realizado por *ordem de chegada*. Recomendamos chegar com antecedência para garantir prioridade.`;
    }

    let telefone = paciente.telefone.replace(/\D/g, "");
    if (!telefone.startsWith("55")) telefone = "55" + telefone;

    if (existente) {
      await supabase
        .from("confirmacoes_agenda")
        .update({
          mensagem_enviada: mensagem,
          link_confirmacao: linkConfirmacao,
          status: "enviada",
          data_envio: new Date().toISOString(),
          erro_descricao: "Envio manual via WhatsApp Web (compartilhamento)",
        })
        .eq("id", existente.id);
    } else {
      await supabase.from("confirmacoes_agenda").insert({
        clinica_id,
        consulta_id,
        paciente_id: paciente.id,
        fila_id: null,
        telefone: paciente.telefone,
        mensagem_enviada: mensagem,
        link_confirmacao: linkConfirmacao,
        token_confirmacao: token,
        status: "enviada",
        data_envio: new Date().toISOString(),
        erro_descricao: "Envio manual via WhatsApp Web (compartilhamento)",
      });
    }

    const wa_url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;

    return new Response(
      JSON.stringify({ success: true, wa_url, mensagem, telefone, link: linkConfirmacao, token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("create-manual-confirmation error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

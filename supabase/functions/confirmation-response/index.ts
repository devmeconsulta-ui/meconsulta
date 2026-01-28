import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsultaData {
  id: string;
  paciente_nome: string;
  medico_nome: string;
  especialidade: string;
  data: string;
  horario: string;
  local: string;
  clinica_nome: string;
  clinica_logo?: string;
  status: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action"); // "get", "confirm", "decline"

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token não fornecido" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar confirmação pelo token - usando FK explícita para evitar ambiguidade
    const { data: confirmacao, error: confirmacaoError } = await supabase
      .from("confirmacoes_agenda")
      .select(`
        *,
        consulta:consultas!confirmacoes_agenda_consulta_id_fkey(
          id,
          data_hora,
          status_consulta,
          paciente:pacientes!consultas_paciente_id_fkey(id, nome),
          medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
          local:locais_atendimento!consultas_local_id_fkey(id, nome_local, endereco, cidade, estado),
          clinica:clinicas!consultas_clinica_id_fkey(id, nome_fantasia, logo_url)
        )
      `)
      .eq("token_confirmacao", token)
      .single();

    console.log("Buscando token:", token);
    console.log("Confirmação encontrada:", confirmacao ? "sim" : "não");
    if (confirmacaoError) {
      console.log("Erro:", confirmacaoError.message);
    }

    if (confirmacaoError || !confirmacao) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Token inválido ou expirado",
          status: "invalid" 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const consulta = confirmacao.consulta as any;

    // Verificar se já foi respondida
    if (confirmacao.status === "confirmada") {
      return new Response(
        JSON.stringify({
          success: true,
          status: "already_confirmed",
          message: "Esta consulta já foi confirmada",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (confirmacao.status === "recusada") {
      return new Response(
        JSON.stringify({
          success: true,
          status: "already_declined",
          message: "Esta consulta já foi recusada",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar se a consulta já passou ou foi cancelada
    const dataConsulta = new Date(consulta.data_hora);
    const agora = new Date();
    
    if (dataConsulta < agora) {
      // Atualizar status para expirado
      await supabase
        .from("confirmacoes_agenda")
        .update({ status: "expirada" })
        .eq("id", confirmacao.id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "expired",
          message: "O prazo para confirmar esta consulta expirou",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (consulta.status_consulta === "cancelada") {
      return new Response(
        JSON.stringify({
          success: false,
          status: "cancelled",
          message: "Esta consulta foi cancelada",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Se for apenas GET, retornar dados da consulta
    if (!action || action === "get") {
      const dataFormatada = dataConsulta.toLocaleDateString("pt-BR");
      const horaFormatada = dataConsulta.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const local = consulta.local;
      const endereco = local
        ? `${local.nome_local}${local.endereco ? ` - ${local.endereco}` : ""}${local.cidade ? `, ${local.cidade}` : ""}${local.estado ? `/${local.estado}` : ""}`
        : "A confirmar";

      const consultaData: ConsultaData = {
        id: consulta.id,
        paciente_nome: consulta.paciente?.nome || "",
        medico_nome: consulta.medico?.nome || "",
        especialidade: consulta.medico?.especialidade || "",
        data: dataFormatada,
        horario: horaFormatada,
        local: endereco,
        clinica_nome: consulta.clinica?.nome_fantasia || "",
        clinica_logo: consulta.clinica?.logo_url || undefined,
        status: confirmacao.status,
      };

      return new Response(
        JSON.stringify({
          success: true,
          status: "valid",
          data: consultaData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Processar ação de confirmar ou recusar
    if (action === "confirm") {
      // Atualizar confirmação
      await supabase
        .from("confirmacoes_agenda")
        .update({
          status: "confirmada",
          data_resposta: new Date().toISOString(),
        })
        .eq("id", confirmacao.id);

      // Atualizar status da consulta
      await supabase
        .from("consultas")
        .update({ status_consulta: "confirmada" })
        .eq("id", consulta.id);

      // Criar notificação para a clínica
      if (confirmacao.clinica_id) {
        await supabase.from("clinica_notificacoes").insert({
          clinica_id: confirmacao.clinica_id,
          titulo: "Consulta confirmada pelo paciente",
          mensagem: `${consulta.paciente?.nome} confirmou a consulta do dia ${dataConsulta.toLocaleDateString("pt-BR")} às ${dataConsulta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          tipo: "sucesso",
          categoria: "consultas",
          referencia_id: consulta.id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "confirmed",
          message: "Consulta confirmada com sucesso!",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "decline") {
      // Atualizar confirmação
      await supabase
        .from("confirmacoes_agenda")
        .update({
          status: "recusada",
          data_resposta: new Date().toISOString(),
        })
        .eq("id", confirmacao.id);

      // Atualizar status da consulta
      await supabase
        .from("consultas")
        .update({ status_consulta: "cancelada" })
        .eq("id", consulta.id);

      // Criar notificação para a clínica
      if (confirmacao.clinica_id) {
        await supabase.from("clinica_notificacoes").insert({
          clinica_id: confirmacao.clinica_id,
          titulo: "Consulta recusada pelo paciente",
          mensagem: `${consulta.paciente?.nome} não poderá comparecer à consulta do dia ${dataConsulta.toLocaleDateString("pt-BR")} às ${dataConsulta.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          tipo: "alerta",
          categoria: "consultas",
          referencia_id: consulta.id,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "declined",
          message: "Consulta cancelada. Obrigado por nos avisar.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Ação inválida" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro no confirmation-response:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

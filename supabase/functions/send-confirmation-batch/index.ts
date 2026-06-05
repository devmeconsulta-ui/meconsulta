import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 800): Promise<Response> {
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

interface ConfirmationRequest {
  consulta_ids: string[];
  fila_id: string;
  clinica_id: string;
  mensagem_template: string;
  intervalo_min: number;
  intervalo_max: number;
  base_url: string;
  agendar_para?: string | null;
  ordem_chegada?: boolean;
}

interface SendResult {
  consulta_id: string;
  success: boolean;
  error?: string;
  token?: string;
  agendado?: boolean;
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
      throw new Error("EVOLUTION_API_URL não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ConfirmationRequest = await req.json();
    const {
      consulta_ids,
      fila_id,
      clinica_id,
      mensagem_template,
      intervalo_min = 3000,
      intervalo_max = 5000,
      base_url,
      agendar_para,
      ordem_chegada = false,
    } = body;

    if (!consulta_ids?.length || !fila_id || !clinica_id) {
      throw new Error("consulta_ids, fila_id e clinica_id são obrigatórios");
    }

    const isAgendado = !!agendar_para;
    const consultasToProcess = consulta_ids.slice(0, 50);

    // Buscar dados da fila (instância Evolution)
    const { data: fila, error: filaError } = await supabase
      .from("omni_filas")
      .select(`*, instancia:omni_instancias(*)`)
      .eq("id", fila_id)
      .single();

    if (filaError || !fila) {
      throw new Error(`Fila não encontrada: ${filaError?.message}`);
    }

    const instancia = fila.instancia;
    if (!instancia?.zapi_instance_id) {
      throw new Error("Fila não possui instância WhatsApp conectada");
    }

    // Buscar dados das consultas
    const { data: consultas, error: consultasError } = await supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        paciente:pacientes!consultas_paciente_id_fkey(id, nome, telefone),
        medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
        local:locais_atendimento!consultas_local_id_fkey(id, nome_local, endereco, cidade, estado)
      `)
      .in("id", consultasToProcess);

    if (consultasError) {
      throw new Error(`Erro ao buscar consultas: ${consultasError.message}`);
    }

    const results: SendResult[] = [];
    let sentCount = 0;

    for (let i = 0; i < consultas.length; i++) {
      const consulta = consultas[i];

      try {
        const paciente = consulta.paciente as any;
        const medico = consulta.medico as any;
        const local = consulta.local as any;

        if (!paciente?.telefone) {
          results.push({ consulta_id: consulta.id, success: false, error: "Paciente sem telefone cadastrado" });
          continue;
        }

        const token = crypto.randomUUID();

        const dataHora = new Date(consulta.data_hora);
        const dataFormatada = dataHora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const horaFormatada = dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

        const endereco = local
          ? `${local.nome_local}${local.endereco ? ` - ${local.endereco}` : ""}${local.cidade ? `, ${local.cidade}` : ""}${local.estado ? `/${local.estado}` : ""}`
          : "A confirmar";

        const linkConfirmacao = `${base_url}/confirmar-consulta/${token}`;

        let mensagem = mensagem_template
          .replace(/{{nome_paciente}}/g, paciente.nome || "")
          .replace(/{{nome_medico}}/g, medico?.nome || "")
          .replace(/{{especialidade}}/g, medico?.especialidade || "")
          .replace(/{{data}}/g, dataFormatada)
          .replace(/{{horario}}/g, horaFormatada)
          .replace(/{{local}}/g, endereco)
          .replace(/{{link_confirmacao}}/g, linkConfirmacao);

        if (ordem_chegada) {
          mensagem += `\n\n⚠️ *Atenção:* O atendimento neste horário será realizado por *ordem de chegada*. Recomendamos chegar com antecedência para garantir prioridade.`;
        }

        let telefone = paciente.telefone.replace(/\D/g, "");
        if (!telefone.startsWith("55")) telefone = "55" + telefone;

        const confirmacaoData: any = {
          clinica_id,
          consulta_id: consulta.id,
          paciente_id: paciente.id,
          fila_id,
          telefone: paciente.telefone,
          mensagem_enviada: mensagem,
          link_confirmacao: linkConfirmacao,
          token_confirmacao: token,
          status: isAgendado ? "agendada" : "pendente",
        };

        if (isAgendado && agendar_para) {
          confirmacaoData.data_agendamento = agendar_para;
        }

        const { data: confirmacao, error: insertError } = await supabase
          .from("confirmacoes_agenda")
          .insert(confirmacaoData)
          .select()
          .single();

        if (insertError) {
          throw new Error(`Erro ao salvar confirmação: ${insertError.message}`);
        }

        if (isAgendado) {
          results.push({ consulta_id: consulta.id, success: true, token, agendado: true });
          continue;
        }

        // Enviar via Evolution
        const evoResponse = await fetchWithRetry(
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

        const evoResult = await evoResponse.json().catch(() => ({}));

        if (!evoResponse.ok) {
          await supabase
            .from("confirmacoes_agenda")
            .update({
              status: "erro",
              erro_descricao: evoResult.message || JSON.stringify(evoResult) || "Erro ao enviar mensagem",
            })
            .eq("id", confirmacao.id);

          results.push({
            consulta_id: consulta.id,
            success: false,
            error: evoResult.message || "Erro ao enviar mensagem",
          });
        } else {
          await supabase
            .from("confirmacoes_agenda")
            .update({
              status: "enviada",
              data_envio: new Date().toISOString(),
              whatsapp_message_id: evoResult?.key?.id || evoResult?.messageId || null,
            })
            .eq("id", confirmacao.id);

          results.push({ consulta_id: consulta.id, success: true, token });
          sentCount++;
        }

        if (i < consultas.length - 1) {
          const delay = Math.floor(Math.random() * (intervalo_max - intervalo_min + 1)) + intervalo_min;
          const extraDelay = sentCount > 0 && sentCount % 20 === 0 ? 10000 : 0;
          await new Promise((resolve) => setTimeout(resolve, delay + extraDelay));
        }
      } catch (error: any) {
        console.error(`Erro na consulta ${consulta.id}:`, error);
        results.push({ consulta_id: consulta.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success && !r.agendado).length;
    const agendadasCount = results.filter((r) => r.agendado).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`[SendConfirmation] Concluído: ${successCount} enviadas, ${agendadasCount} agendadas, ${failCount} falhas (via Evolution)`);

    return new Response(
      JSON.stringify({ success: true, total: results.length, enviadas: successCount, agendadas: agendadasCount, falhas: failCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro no send-confirmation-batch:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

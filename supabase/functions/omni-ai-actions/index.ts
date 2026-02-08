import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionRequest {
  action: string;
  params: Record<string, any>;
  clinica_id: string;
  contato_telefone?: string;
  atendimento_id?: string;
  agente_id?: string;
}

interface ActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const request: ActionRequest = await req.json();
    const { action, params, clinica_id, contato_telefone, atendimento_id, agente_id } = request;

    console.log(`[AI-Actions] Processing action: ${action}`, params);

    let result: ActionResponse;

    switch (action) {
      case "buscar_medicos":
        result = await buscarMedicos(supabase, clinica_id, params);
        break;
      case "buscar_especialidades":
        result = await buscarEspecialidades(supabase, clinica_id);
        break;
      case "buscar_horarios":
        result = await buscarHorarios(supabase, clinica_id, params);
        break;
      case "buscar_paciente":
        result = await buscarPaciente(supabase, clinica_id, params, contato_telefone);
        break;
      case "criar_paciente":
        result = await criarPaciente(supabase, clinica_id, params, contato_telefone);
        break;
      case "agendar_consulta":
        result = await agendarConsulta(supabase, clinica_id, params, atendimento_id, agente_id);
        break;
      case "cancelar_consulta":
        result = await cancelarConsulta(supabase, clinica_id, params);
        break;
      case "listar_consultas_paciente":
        result = await listarConsultasPaciente(supabase, clinica_id, params);
        break;
      case "buscar_convenios":
        result = await buscarConvenios(supabase, clinica_id);
        break;
      default:
        result = { success: false, error: `Unknown action: ${action}` };
    }

    // Log the action
    await supabase.from("omni_ia_agendamentos_log").insert({
      clinica_id,
      agente_id,
      atendimento_id,
      acao: action,
      dados: params,
      sucesso: result.success,
      erro: result.error || null,
    });

    console.log(`[AI-Actions] Result:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AI-Actions] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ==================== ACTION HANDLERS ====================

async function buscarMedicos(supabase: any, clinicaId: string, params: Record<string, any>): Promise<ActionResponse> {
  try {
    let query = supabase
      .from("clinicas_medicos")
      .select(`
        medico:medicos(
          id,
          nome,
          especialidade,
          valor_consulta,
          foto_url,
          crm,
          ativo
        )
      `)
      .eq("clinica_id", clinicaId)
      .eq("ativo", true);

    const { data, error } = await query;
    if (error) throw error;

    let medicos = data
      ?.map((cm: any) => cm.medico)
      .filter((m: any) => m && m.ativo);

    // Filter by especialidade if provided
    if (params.especialidade) {
      const esp = params.especialidade.toLowerCase();
      medicos = medicos?.filter((m: any) => 
        m.especialidade?.toLowerCase().includes(esp)
      );
    }

    // Filter by name if provided
    if (params.nome) {
      const nome = params.nome.toLowerCase();
      medicos = medicos?.filter((m: any) => 
        m.nome?.toLowerCase().includes(nome)
      );
    }

    if (!medicos || medicos.length === 0) {
      return {
        success: true,
        data: [],
        message: "Não encontrei médicos disponíveis com esses critérios. Posso buscar outras especialidades?",
      };
    }

    // Format response for AI
    const medicosFormatados = medicos.map((m: any) => ({
      id: m.id,
      nome: m.nome,
      especialidade: m.especialidade || "Clínico Geral",
      valor: m.valor_consulta || 0,
      crm: m.crm,
    }));

    const listaTexto = medicosFormatados
      .map((m: any) => `• ${m.nome} - ${m.especialidade} (R$ ${m.valor.toFixed(2)})`)
      .join("\n");

    return {
      success: true,
      data: medicosFormatados,
      message: `Encontrei ${medicosFormatados.length} médico(s):\n${listaTexto}`,
    };
  } catch (error) {
    console.error("[buscarMedicos] Error:", error);
    return { success: false, error: "Erro ao buscar médicos" };
  }
}

async function buscarEspecialidades(supabase: any, clinicaId: string): Promise<ActionResponse> {
  try {
    const { data, error } = await supabase
      .from("clinicas_medicos")
      .select(`medico:medicos(especialidade)`)
      .eq("clinica_id", clinicaId)
      .eq("ativo", true);

    if (error) throw error;

    const especialidades = [...new Set(
      data
        ?.map((cm: any) => cm.medico?.especialidade)
        .filter((e: any) => e)
    )];

    return {
      success: true,
      data: especialidades,
      message: `Especialidades disponíveis: ${especialidades.join(", ")}`,
    };
  } catch (error) {
    console.error("[buscarEspecialidades] Error:", error);
    return { success: false, error: "Erro ao buscar especialidades" };
  }
}

async function buscarHorarios(supabase: any, clinicaId: string, params: Record<string, any>): Promise<ActionResponse> {
  try {
    const { medico_id, especialidade, data_inicio, data_fim, limit = 10 } = params;

    // Get medico IDs based on criteria
    let medicoIds: string[] = [];
    
    if (medico_id) {
      medicoIds = [medico_id];
    } else if (especialidade) {
      const { data: medicoData } = await supabase
        .from("clinicas_medicos")
        .select(`medico:medicos!inner(id, especialidade)`)
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .ilike("medico.especialidade", `%${especialidade}%`);
      
      medicoIds = medicoData?.map((m: any) => m.medico.id) || [];
    } else {
      // Get all clinic doctors
      const { data: medicoData } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);
      
      medicoIds = medicoData?.map((m: any) => m.medico_id) || [];
    }

    if (medicoIds.length === 0) {
      return { success: true, data: [], message: "Não encontrei médicos com esses critérios." };
    }

    // Calculate date range - parse dates correctly to avoid timezone issues
    const now = new Date();
    
    // Parse date strings as local dates (YYYY-MM-DD format)
    let startDate: Date;
    let endDate: Date;
    
    if (data_inicio) {
      // Parse as start of day in UTC
      const [year, month, day] = data_inicio.split("-").map(Number);
      startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    } else {
      startDate = now;
    }
    
    if (data_fim) {
      // Parse as END of day in UTC (23:59:59) to include all slots on that day
      const [year, month, day] = data_fim.split("-").map(Number);
      endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    } else {
      endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default
    }

    console.log(`[buscarHorarios] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch available slots
    const { data: slots, error } = await supabase
      .from("agenda_slots")
      .select(`
        id,
        data_hora,
        tipo_slot,
        medico:medicos(id, nome, especialidade, valor_consulta)
      `)
      .in("medico_id", medicoIds)
      .eq("disponivel", true)
      .gte("data_hora", startDate.toISOString())
      .lte("data_hora", endDate.toISOString())
      .order("data_hora", { ascending: true })
      .limit(limit);

    if (error) throw error;

    if (!slots || slots.length === 0) {
      return {
        success: true,
        data: [],
        message: "Não encontrei horários disponíveis nesse período. Quer que eu busque em outras datas?",
      };
    }

    // Format for AI
    const horariosFormatados = slots.map((s: any) => {
      const dataHora = new Date(s.data_hora);
      const dia = dataHora.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
      const hora = dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      
      return {
        slot_id: s.id,
        data_hora: s.data_hora,
        data_formatada: `${dia} às ${hora}`,
        medico_id: s.medico?.id,
        medico_nome: s.medico?.nome,
        especialidade: s.medico?.especialidade,
        valor: s.medico?.valor_consulta || 0,
      };
    });

    const listaTexto = horariosFormatados
      .slice(0, 5)
      .map((h: any) => `• ${h.data_formatada} - ${h.medico_nome} (R$ ${h.valor.toFixed(2)})`)
      .join("\n");

    return {
      success: true,
      data: horariosFormatados,
      message: `Horários disponíveis:\n${listaTexto}${horariosFormatados.length > 5 ? `\n... e mais ${horariosFormatados.length - 5} horários` : ""}`,
    };
  } catch (error) {
    console.error("[buscarHorarios] Error:", error);
    return { success: false, error: "Erro ao buscar horários" };
  }
}

async function buscarPaciente(supabase: any, clinicaId: string, params: Record<string, any>, contato_telefone?: string): Promise<ActionResponse> {
  try {
    const { cpf, telefone, nome } = params;
    const telefoneBusca = telefone || contato_telefone;

    let query = supabase.from("pacientes").select("*");

    if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, "");
      query = query.eq("cpf", cpfLimpo);
    } else if (telefoneBusca) {
      const telLimpo = telefoneBusca.replace(/\D/g, "");
      query = query.or(`telefone.ilike.%${telLimpo}%,celular.ilike.%${telLimpo}%`);
    } else if (nome) {
      query = query.ilike("nome", `%${nome}%`);
    } else {
      return { success: false, error: "Informe CPF, telefone ou nome para buscar" };
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        success: true,
        data: null,
        message: "Não encontrei nenhum cadastro com esses dados. Posso fazer seu cadastro agora para agilizar.",
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        nome: data.nome,
        cpf: data.cpf,
        telefone: data.telefone || data.celular,
        email: data.email,
        data_nascimento: data.data_nascimento,
      },
      message: `Encontrei seu cadastro: ${data.nome}. Podemos continuar com o agendamento!`,
    };
  } catch (error) {
    console.error("[buscarPaciente] Error:", error);
    return { success: false, error: "Erro ao buscar paciente" };
  }
}

async function criarPaciente(supabase: any, clinicaId: string, params: Record<string, any>, contato_telefone?: string): Promise<ActionResponse> {
  try {
    const { nome, cpf, telefone, email, data_nascimento } = params;

    if (!nome) {
      return { success: false, error: "Nome é obrigatório para criar o cadastro" };
    }

    const telFinal = telefone || contato_telefone;
    const cpfLimpo = cpf ? cpf.replace(/\D/g, "") : null;

    // Check if already exists
    if (cpfLimpo) {
      const { data: existing } = await supabase
        .from("pacientes")
        .select("id")
        .eq("cpf", cpfLimpo)
        .maybeSingle();

      if (existing) {
        return {
          success: true,
          data: { id: existing.id },
          message: "Já existe um cadastro com esse CPF. Usando cadastro existente.",
        };
      }
    }

    const { data, error } = await supabase
      .from("pacientes")
      .insert({
        nome,
        cpf: cpfLimpo,
        celular: telFinal,
        telefone: telFinal,
        email,
        data_nascimento,
      })
      .select("id, nome")
      .single();

    if (error) throw error;

    return {
      success: true,
      data: { id: data.id, nome: data.nome },
      message: `Cadastro criado com sucesso para ${data.nome}!`,
    };
  } catch (error) {
    console.error("[criarPaciente] Error:", error);
    return { success: false, error: "Erro ao criar paciente" };
  }
}

async function agendarConsulta(supabase: any, clinicaId: string, params: Record<string, any>, atendimentoId?: string, agenteId?: string): Promise<ActionResponse> {
  try {
    const { 
      paciente_id, 
      slot_id, 
      medico_id, 
      data_hora, 
      tipo_atendimento = "particular",
      convenio_id,
      valor,
      nome_paciente
    } = params;

    if (!paciente_id && !nome_paciente) {
      return { success: false, error: "Precisamos do paciente para agendar. Você pode me informar o CPF ou nome completo?" };
    }

    // Get slot or validate data_hora
    let slotData: any = null;
    let medicoIdFinal = medico_id;
    let dataHoraFinal = data_hora;
    let valorFinal = valor;

    if (slot_id) {
      const { data: slot, error } = await supabase
        .from("agenda_slots")
        .select("*, medico:medicos(id, nome, valor_consulta)")
        .eq("id", slot_id)
        .eq("disponivel", true)
        .single();

      if (error || !slot) {
        return { success: false, error: "Esse horário não está mais disponível. Vou buscar outros horários para você." };
      }

      slotData = slot;
      medicoIdFinal = slot.medico_id;
      dataHoraFinal = slot.data_hora;
      valorFinal = valor || slot.medico?.valor_consulta || 0;
    }

    if (!medicoIdFinal || !dataHoraFinal) {
      return { success: false, error: "Preciso saber o médico e horário para agendar" };
    }

    // Get clinic attendant for round-robin distribution
    const usuarioClinicaId = await getProximoAtendente(supabase, clinicaId);

    // Create the consulta
    const { data: consulta, error: consultaError } = await supabase
      .from("consultas")
      .insert({
        clinica_id: clinicaId,
        medico_id: medicoIdFinal,
        paciente_id,
        nome_paciente_consulta: nome_paciente,
        data_hora: dataHoraFinal,
        valor_consulta: valorFinal || 0,
        valor_medico: (valorFinal || 0) * 0.7,
        valor_plataforma: (valorFinal || 0) * 0.3,
        status_consulta: "confirmada",
        status_pagamento: tipo_atendimento === "convenio" ? "nao_integrado" : "pendente",
        tipo_atendimento,
        convenio_id: convenio_id || null,
        origem: "ia_whatsapp",
        usuario_clinica_id: usuarioClinicaId,
        agenda_slot_id: slot_id || null,
      })
      .select("id, data_hora, medico:medicos(nome)")
      .single();

    if (consultaError) throw consultaError;

    // Mark slot as unavailable if used
    if (slot_id) {
      await supabase
        .from("agenda_slots")
        .update({ disponivel: false })
        .eq("id", slot_id);
    }

    // Log the scheduling
    await supabase.from("omni_ia_agendamentos_log").insert({
      clinica_id: clinicaId,
      agente_id: agenteId,
      atendimento_id: atendimentoId,
      consulta_id: consulta.id,
      paciente_id,
      usuario_clinica_id: usuarioClinicaId,
      acao: "consulta_agendada",
      dados: params,
      sucesso: true,
    });

    const dataFormatada = new Date(consulta.data_hora).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      success: true,
      data: {
        consulta_id: consulta.id,
        data_hora: consulta.data_hora,
        medico_nome: consulta.medico?.nome,
      },
      message: `✅ Consulta agendada com sucesso!\n\n📅 ${dataFormatada}\n👨‍⚕️ ${consulta.medico?.nome}\n\nVocê receberá uma confirmação por WhatsApp. Até lá!`,
    };
  } catch (error) {
    console.error("[agendarConsulta] Error:", error);
    return { success: false, error: "Erro ao agendar consulta. Tente novamente." };
  }
}

async function cancelarConsulta(supabase: any, clinicaId: string, params: Record<string, any>): Promise<ActionResponse> {
  try {
    const { consulta_id, paciente_id, motivo } = params;

    let query = supabase
      .from("consultas")
      .update({ 
        status_consulta: "cancelada",
        observacoes_paciente: motivo || "Cancelado via IA WhatsApp"
      })
      .eq("clinica_id", clinicaId);

    if (consulta_id) {
      query = query.eq("id", consulta_id);
    } else if (paciente_id) {
      query = query
        .eq("paciente_id", paciente_id)
        .in("status_consulta", ["aguardando_pagamento", "confirmada"])
        .order("data_hora", { ascending: true })
        .limit(1);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;

    // Free up the slot
    if (data.agenda_slot_id) {
      await supabase
        .from("agenda_slots")
        .update({ disponivel: true })
        .eq("id", data.agenda_slot_id);
    }

    return {
      success: true,
      data: { consulta_id: data.id },
      message: "Consulta cancelada com sucesso. Posso ajudar a reagendar?",
    };
  } catch (error) {
    console.error("[cancelarConsulta] Error:", error);
    return { success: false, error: "Erro ao cancelar consulta" };
  }
}

async function listarConsultasPaciente(supabase: any, clinicaId: string, params: Record<string, any>): Promise<ActionResponse> {
  try {
    const { paciente_id, status } = params;

    if (!paciente_id) {
      return { success: false, error: "Preciso identificar o paciente primeiro" };
    }

    let query = supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        status_consulta,
        valor_consulta,
        tipo_atendimento,
        medico:medicos(nome, especialidade)
      `)
      .eq("clinica_id", clinicaId)
      .eq("paciente_id", paciente_id)
      .order("data_hora", { ascending: false })
      .limit(10);

    if (status) {
      query = query.eq("status_consulta", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: "Você não tem consultas agendadas. Quer marcar uma agora?",
      };
    }

    const proximasConsultas = data.filter((c: any) => 
      new Date(c.data_hora) > new Date() && 
      !["cancelada", "finalizada"].includes(c.status_consulta)
    );

    if (proximasConsultas.length === 0) {
      return {
        success: true,
        data,
        message: "Você não tem consultas futuras agendadas. Posso ajudar a marcar uma?",
      };
    }

    const lista = proximasConsultas
      .slice(0, 3)
      .map((c: any) => {
        const data = new Date(c.data_hora).toLocaleDateString("pt-BR", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
        });
        return `• ${data} - ${c.medico?.nome} (${c.medico?.especialidade})`;
      })
      .join("\n");

    return {
      success: true,
      data: proximasConsultas,
      message: `Suas próximas consultas:\n${lista}`,
    };
  } catch (error) {
    console.error("[listarConsultasPaciente] Error:", error);
    return { success: false, error: "Erro ao buscar consultas" };
  }
}

async function buscarConvenios(supabase: any, clinicaId: string): Promise<ActionResponse> {
  try {
    const { data, error } = await supabase
      .from("convenios")
      .select("id, nome")
      .eq("clinica_id", clinicaId)
      .eq("ativo", true);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        success: true,
        data: [],
        message: "Esta clínica trabalha apenas com atendimento particular no momento.",
      };
    }

    return {
      success: true,
      data,
      message: `Convênios aceitos: ${data.map((c: any) => c.nome).join(", ")}. Também atendemos particular.`,
    };
  } catch (error) {
    console.error("[buscarConvenios] Error:", error);
    return { success: false, error: "Erro ao buscar convênios" };
  }
}

// ==================== HELPER FUNCTIONS ====================

async function getProximoAtendente(supabase: any, clinicaId: string): Promise<string | null> {
  try {
    // Get all active attendants from the clinic
    const { data: usuarios } = await supabase
      .from("usuarios_clinica")
      .select("id")
      .eq("clinica_id", clinicaId)
      .eq("ativo", true)
      .in("role", ["atendente", "admin", "gestor"]);

    if (!usuarios || usuarios.length === 0) return null;

    // Count today's appointments per attendant
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const { data: contagem } = await supabase
      .from("consultas")
      .select("usuario_clinica_id")
      .eq("clinica_id", clinicaId)
      .gte("created_at", hoje.toISOString())
      .not("usuario_clinica_id", "is", null);

    const contagemPorUsuario: Record<string, number> = {};
    usuarios.forEach((u: any) => contagemPorUsuario[u.id] = 0);
    
    contagem?.forEach((c: any) => {
      if (contagemPorUsuario[c.usuario_clinica_id] !== undefined) {
        contagemPorUsuario[c.usuario_clinica_id]++;
      }
    });

    // Return the one with fewest appointments (round-robin)
    const sorted = Object.entries(contagemPorUsuario)
      .sort(([, a], [, b]) => a - b);

    return sorted[0]?.[0] || null;
  } catch (error) {
    console.error("[getProximoAtendente] Error:", error);
    return null;
  }
}

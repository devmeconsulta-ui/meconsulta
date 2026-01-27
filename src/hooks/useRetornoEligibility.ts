import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface RetornoInfo {
  isElegivel: boolean;
  ultimaConsulta: Date | null;
  diasDesdeUltimaConsulta: number | null;
}

/**
 * Verifica se um paciente é elegível para retorno gratuito
 * Regras:
 * - Paciente deve ter consulta concluída/atendida nos últimos 30 dias
 * - Consulta deve ser com o mesmo médico
 * - Se elegível, o valor da consulta deve ser zero
 */
export async function checkRetornoEligibility(
  pacienteId: string | null,
  medicoId: string
): Promise<RetornoInfo> {
  if (!pacienteId) {
    return { isElegivel: false, ultimaConsulta: null, diasDesdeUltimaConsulta: null };
  }

  const trintaDiasAtras = subDays(new Date(), 30);

  const { data, error } = await supabase
    .from("consultas")
    .select("data_hora")
    .eq("paciente_id", pacienteId)
    .eq("medico_id", medicoId)
    .in("status_consulta", ["concluida", "atendida_medico"])
    .gte("data_hora", trintaDiasAtras.toISOString())
    .order("data_hora", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return { isElegivel: false, ultimaConsulta: null, diasDesdeUltimaConsulta: null };
  }

  const ultimaConsultaDate = new Date(data[0].data_hora);
  const hoje = new Date();
  const diasDesdeUltimaConsulta = Math.floor(
    (hoje.getTime() - ultimaConsultaDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isElegivel: true,
    ultimaConsulta: ultimaConsultaDate,
    diasDesdeUltimaConsulta,
  };
}

/**
 * Verifica retorno para múltiplos pacientes de uma vez (para agenda)
 * Retorna um Set com os IDs dos pacientes elegíveis para retorno
 */
export async function checkRetornoEligibilityBatch(
  pacienteIds: string[],
  medicoId: string
): Promise<Set<string>> {
  if (pacienteIds.length === 0) {
    return new Set();
  }

  const trintaDiasAtras = subDays(new Date(), 30);
  const uniqueIds = [...new Set(pacienteIds)];

  const { data, error } = await supabase
    .from("consultas")
    .select("paciente_id, data_hora")
    .in("paciente_id", uniqueIds)
    .eq("medico_id", medicoId)
    .in("status_consulta", ["concluida", "atendida_medico"])
    .gte("data_hora", trintaDiasAtras.toISOString());

  if (error || !data) {
    return new Set();
  }

  // Pacientes que têm pelo menos uma consulta nos últimos 30 dias são elegíveis
  const pacientesElegiveis = new Set<string>();
  data.forEach((consulta) => {
    if (consulta.paciente_id) {
      pacientesElegiveis.add(consulta.paciente_id);
    }
  });

  return pacientesElegiveis;
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "medico" | "paciente";
  ativo: boolean;
  created_at: string;
}

export interface Medico {
  id: string;
  usuario_id: string | null;
  nome: string;
  especialidade: string | null;
  crm: string | null;
  valor_consulta: number;
  percentual_repasse: number;
  pix_key: string | null;
  pix_key_type: string | null;
  ativo: boolean;
  created_at: string;
}

export interface Paciente {
  id: string;
  usuario_id: string | null;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  asaas_customer_id: string | null;
  created_at: string;
}

export interface Consulta {
  id: string;
  medico_id: string | null;
  paciente_id: string | null;
  data_hora: string;
  status_consulta: string;
  valor_consulta: number;
  valor_medico: number;
  valor_plataforma: number;
  asaas_payment_id: string | null;
  status_pagamento: string;
  status_repasse: string;
  created_at: string;
  medico?: Medico;
  paciente?: Paciente;
}

// Dashboard Stats
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [medicosResult, pacientesResult, consultasHojeResult, consultasPagasResult] =
        await Promise.all([
          supabase.from("medicos").select("id", { count: "exact" }).eq("ativo", true),
          supabase.from("pacientes").select("id", { count: "exact" }),
          supabase
            .from("consultas")
            .select("id", { count: "exact" })
            .gte("data_hora", `${today}T00:00:00`)
            .lte("data_hora", `${today}T23:59:59`),
          supabase
            .from("consultas")
            .select("id", { count: "exact" })
            .eq("status_pagamento", "pago")
            .gte("created_at", sevenDaysAgo),
        ]);

      return {
        totalMedicos: medicosResult.count || 0,
        totalPacientes: pacientesResult.count || 0,
        consultasHoje: consultasHojeResult.count || 0,
        consultasPagas: consultasPagasResult.count || 0,
      };
    },
  });
}

// Latest Consultas
export function useLatestConsultas(limit = 10) {
  return useQuery({
    queryKey: ["latest-consultas", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          *,
          medico:medicos(id, nome),
          paciente:pacientes(id, nome)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

// Médicos
export function useMedicos(search?: string) {
  return useQuery({
    queryKey: ["medicos", search],
    queryFn: async () => {
      let query = supabase.from("medicos").select("*").order("created_at", { ascending: false });

      if (search) {
        query = query.or(`nome.ilike.%${search}%,especialidade.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Medico[];
    },
  });
}

export function useCreateMedico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      nome: string;
      email: string;
      especialidade?: string;
      crm?: string;
      valor_consulta: number;
      percentual_repasse: number;
      pix_key?: string;
      pix_key_type?: string;
    }) => {
      // Create usuario first
      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .insert({
          nome: data.nome,
          email: data.email,
          tipo: "medico",
        })
        .select()
        .single();

      if (usuarioError) throw usuarioError;

      // Create medico
      const { data: medico, error: medicoError } = await supabase
        .from("medicos")
        .insert({
          usuario_id: usuario.id,
          nome: data.nome,
          especialidade: data.especialidade,
          crm: data.crm,
          valor_consulta: data.valor_consulta,
          percentual_repasse: data.percentual_repasse,
          pix_key: data.pix_key,
          pix_key_type: data.pix_key_type,
        })
        .select()
        .single();

      if (medicoError) throw medicoError;
      return medico;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medicos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// Pacientes
export function usePacientes(search?: string) {
  return useQuery({
    queryKey: ["pacientes", search],
    queryFn: async () => {
      let query = supabase.from("pacientes").select("*").order("created_at", { ascending: false });

      if (search) {
        query = query.or(`nome.ilike.%${search}%,cpf.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Paciente[];
    },
  });
}

export function useCreatePaciente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      nome: string;
      email: string;
      cpf?: string;
      telefone?: string;
      data_nascimento?: string;
    }) => {
      // Create usuario first
      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .insert({
          nome: data.nome,
          email: data.email,
          tipo: "paciente",
        })
        .select()
        .single();

      if (usuarioError) throw usuarioError;

      // Create paciente
      const { data: paciente, error: pacienteError } = await supabase
        .from("pacientes")
        .insert({
          usuario_id: usuario.id,
          nome: data.nome,
          cpf: data.cpf,
          telefone: data.telefone,
          data_nascimento: data.data_nascimento,
        })
        .select()
        .single();

      if (pacienteError) throw pacienteError;
      return paciente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pacientes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// Consultas
export function useConsultas(filters?: {
  dataInicio?: string;
  dataFim?: string;
  statusConsulta?: string;
  statusPagamento?: string;
}) {
  return useQuery({
    queryKey: ["consultas", filters],
    queryFn: async () => {
      let query = supabase
        .from("consultas")
        .select(`
          *,
          medico:medicos(id, nome),
          paciente:pacientes(id, nome)
        `)
        .order("data_hora", { ascending: false });

      if (filters?.dataInicio) {
        query = query.gte("data_hora", filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte("data_hora", filters.dataFim);
      }
      if (filters?.statusConsulta) {
        query = query.eq("status_consulta", filters.statusConsulta);
      }
      if (filters?.statusPagamento) {
        query = query.eq("status_pagamento", filters.statusPagamento);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

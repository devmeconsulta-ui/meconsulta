import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CrmFunil {
  id: string;
  clinica_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface CrmEtapa {
  id: string;
  funil_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  pode_ganhar: boolean;
  pode_criar: boolean;
  tempo_estagnacao_dias: number;
  probabilidade_ganho: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmLead {
  id: string;
  clinica_id: string;
  funil_id: string;
  etapa_id: string;
  paciente_id: string | null;
  consulta_id: string | null;
  nome: string;
  telefone: string | null;
  email: string | null;
  valor_estimado: number;
  origem: string;
  responsavel_id: string | null;
  data_vencimento: string | null;
  observacoes: string | null;
  tags: string[] | null;
  ordem: number;
  ganho: boolean;
  perdido: boolean;
  motivo_perda: string | null;
  data_ganho: string | null;
  data_perda: string | null;
  created_at: string;
  updated_at: string;
  responsavel?: {
    nome: string;
  };
}

export function useCrmClinica(clinicaId: string | null) {
  const queryClient = useQueryClient();
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null);

  // Buscar funis da clínica
  const { data: funis = [], isLoading: loadingFunis } = useQuery({
    queryKey: ["crm-funis", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      const { data, error } = await supabase
        .from("crm_funis")
        .select("*")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as CrmFunil[];
    },
    enabled: !!clinicaId,
  });

  // Auto-selecionar primeiro funil
  useEffect(() => {
    if (funis.length > 0 && !funilSelecionado) {
      setFunilSelecionado(funis[0].id);
    }
  }, [funis, funilSelecionado]);

  // Buscar etapas do funil selecionado
  const { data: etapas = [], isLoading: loadingEtapas } = useQuery({
    queryKey: ["crm-etapas", funilSelecionado],
    queryFn: async () => {
      if (!funilSelecionado) return [];
      const { data, error } = await supabase
        .from("crm_etapas")
        .select("*")
        .eq("funil_id", funilSelecionado)
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as CrmEtapa[];
    },
    enabled: !!funilSelecionado,
  });

  // Buscar leads do funil selecionado
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["crm-leads", funilSelecionado],
    queryFn: async () => {
      if (!funilSelecionado) return [];
      const { data, error } = await supabase
        .from("crm_leads")
        .select(`
          *,
          responsavel:usuarios_clinica!crm_leads_responsavel_id_fkey(nome)
        `)
        .eq("funil_id", funilSelecionado)
        .eq("ganho", false)
        .eq("perdido", false)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as CrmLead[];
    },
    enabled: !!funilSelecionado,
  });

  // Criar funil
  const criarFunil = useMutation({
    mutationFn: async (dados: { nome: string; descricao?: string }) => {
      if (!clinicaId) throw new Error("Clínica não selecionada");
      
      const { data: funil, error: funilError } = await supabase
        .from("crm_funis")
        .insert({
          clinica_id: clinicaId,
          nome: dados.nome,
          descricao: dados.descricao || null,
          ordem: funis.length,
        })
        .select()
        .single();
      
      if (funilError) throw funilError;

      // Criar etapas padrão
      const etapasPadrao = [
        { nome: "Novo Lead", cor: "#3b82f6", ordem: 0 },
        { nome: "Contato Feito", cor: "#f59e0b", ordem: 1 },
        { nome: "Proposta Enviada", cor: "#8b5cf6", ordem: 2 },
        { nome: "Negociação", cor: "#f97316", ordem: 3 },
        { nome: "Fechado", cor: "#22c55e", ordem: 4, pode_ganhar: true },
      ];

      const { error: etapasError } = await supabase
        .from("crm_etapas")
        .insert(etapasPadrao.map(e => ({
          funil_id: funil.id,
          ...e,
        })));

      if (etapasError) throw etapasError;

      return funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funis", clinicaId] });
      toast.success("Funil criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar funil:", error);
      toast.error("Erro ao criar funil");
    },
  });

  // Atualizar funil
  const atualizarFunil = useMutation({
    mutationFn: async (dados: { id: string; nome: string; descricao?: string }) => {
      const { error } = await supabase
        .from("crm_funis")
        .update({
          nome: dados.nome,
          descricao: dados.descricao || null,
        })
        .eq("id", dados.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funis", clinicaId] });
      toast.success("Funil atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar funil"),
  });

  // Excluir funil
  const excluirFunil = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_funis")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-funis", clinicaId] });
      setFunilSelecionado(null);
      toast.success("Funil excluído!");
    },
    onError: () => toast.error("Erro ao excluir funil"),
  });

  // Criar etapa
  const criarEtapa = useMutation({
    mutationFn: async (dados: Partial<CrmEtapa>) => {
      if (!funilSelecionado) throw new Error("Funil não selecionado");
      const { error } = await supabase
        .from("crm_etapas")
        .insert({
          funil_id: funilSelecionado,
          nome: dados.nome || "Nova Etapa",
          cor: dados.cor || "#3b82f6",
          ordem: etapas.length,
          descricao: dados.descricao,
          pode_ganhar: dados.pode_ganhar || false,
          pode_criar: dados.pode_criar !== false,
          tempo_estagnacao_dias: dados.tempo_estagnacao_dias || 0,
          probabilidade_ganho: dados.probabilidade_ganho || 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-etapas", funilSelecionado] });
      toast.success("Etapa criada!");
    },
    onError: () => toast.error("Erro ao criar etapa"),
  });

  // Atualizar etapa
  const atualizarEtapa = useMutation({
    mutationFn: async (dados: Partial<CrmEtapa> & { id: string }) => {
      const { id, ...updateData } = dados;
      const { error } = await supabase
        .from("crm_etapas")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-etapas", funilSelecionado] });
      toast.success("Etapa atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar etapa"),
  });

  // Excluir etapa
  const excluirEtapa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_etapas")
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-etapas", funilSelecionado] });
      toast.success("Etapa excluída!");
    },
    onError: () => toast.error("Erro ao excluir etapa"),
  });

  // Criar lead
  const criarLead = useMutation({
    mutationFn: async (dados: Partial<CrmLead>) => {
      if (!clinicaId || !funilSelecionado) throw new Error("Dados incompletos");
      const primeiraEtapa = etapas[0];
      if (!primeiraEtapa) throw new Error("Nenhuma etapa disponível");

      const { error } = await supabase
        .from("crm_leads")
        .insert({
          clinica_id: clinicaId,
          funil_id: funilSelecionado,
          etapa_id: dados.etapa_id || primeiraEtapa.id,
          nome: dados.nome || "Novo Lead",
          telefone: dados.telefone,
          email: dados.email,
          valor_estimado: dados.valor_estimado || 0,
          origem: dados.origem || "manual",
          responsavel_id: dados.responsavel_id,
          data_vencimento: dados.data_vencimento,
          observacoes: dados.observacoes,
          tags: dados.tags,
          ordem: leads.filter(l => l.etapa_id === (dados.etapa_id || primeiraEtapa.id)).length,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads", funilSelecionado] });
      toast.success("Lead criado!");
    },
    onError: () => toast.error("Erro ao criar lead"),
  });

  // Atualizar lead
  const atualizarLead = useMutation({
    mutationFn: async (dados: Partial<CrmLead> & { id: string }) => {
      const { id, ...updateData } = dados;
      const { error } = await supabase
        .from("crm_leads")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads", funilSelecionado] });
    },
    onError: () => toast.error("Erro ao atualizar lead"),
  });

  // Mover lead para outra etapa
  const moverLead = useCallback(async (
    leadId: string,
    novaEtapaId: string,
    novaOrdem: number,
    usuarioClinicaId?: string
  ) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const etapaAnteriorId = lead.etapa_id;

    // Atualizar lead
    const { error } = await supabase
      .from("crm_leads")
      .update({
        etapa_id: novaEtapaId,
        ordem: novaOrdem,
      })
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao mover lead");
      return;
    }

    // Registrar histórico
    if (etapaAnteriorId !== novaEtapaId) {
      await supabase.from("crm_leads_historico").insert({
        lead_id: leadId,
        etapa_anterior_id: etapaAnteriorId,
        etapa_nova_id: novaEtapaId,
        usuario_clinica_id: usuarioClinicaId,
        automatico: false,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["crm-leads", funilSelecionado] });
  }, [leads, funilSelecionado, queryClient]);

  // Marcar como ganho
  const marcarGanho = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          ganho: true,
          data_ganho: new Date().toISOString(),
        })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads", funilSelecionado] });
      toast.success("Lead marcado como ganho!");
    },
    onError: () => toast.error("Erro ao marcar lead"),
  });

  // Marcar como perdido
  const marcarPerdido = useMutation({
    mutationFn: async (dados: { id: string; motivo?: string }) => {
      const { error } = await supabase
        .from("crm_leads")
        .update({
          perdido: true,
          data_perda: new Date().toISOString(),
          motivo_perda: dados.motivo,
        })
        .eq("id", dados.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads", funilSelecionado] });
      toast.success("Lead marcado como perdido");
    },
    onError: () => toast.error("Erro ao marcar lead"),
  });

  // Excluir lead
  const excluirLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_leads")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads", funilSelecionado] });
      toast.success("Lead excluído!");
    },
    onError: () => toast.error("Erro ao excluir lead"),
  });

  // Estatísticas do funil
  const estatisticas = {
    totalLeads: leads.length,
    valorTotal: leads.reduce((acc, lead) => acc + (lead.valor_estimado || 0), 0),
    leadsPorEtapa: etapas.map(etapa => ({
      ...etapa,
      quantidade: leads.filter(l => l.etapa_id === etapa.id).length,
      valor: leads.filter(l => l.etapa_id === etapa.id)
        .reduce((acc, l) => acc + (l.valor_estimado || 0), 0),
    })),
  };

  return {
    funis,
    funilSelecionado,
    setFunilSelecionado,
    etapas,
    leads,
    estatisticas,
    isLoading: loadingFunis || loadingEtapas || loadingLeads,
    criarFunil,
    atualizarFunil,
    excluirFunil,
    criarEtapa,
    atualizarEtapa,
    excluirEtapa,
    criarLead,
    atualizarLead,
    moverLead,
    marcarGanho,
    marcarPerdido,
    excluirLead,
  };
}

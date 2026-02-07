import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AcaoFollowUp {
  id: string;
  tempo_minutos: number;
  acao: "mensagem" | "encerrar" | "transferir";
  mensagem: string;
  ativa: boolean;
}

export interface OmniIAAgente {
  id: string;
  clinica_id: string;
  nome: string;
  descricao: string | null;
  modelo: string;
  avatar_url: string | null;
  comunicacao: "formal" | "normal" | "descontraida";
  comportamento: string | null;
  finalidade: "suporte" | "vendas" | "pessoal";
  produto: string | null;
  site_url: string | null;
  descricao_produto: string | null;
  ativo: boolean;
  fila_operacao_id: string | null;
  transferir_para_humano: boolean;
  usar_emojis: boolean;
  assinar_nome: boolean;
  restringir_temas: boolean;
  dividir_resposta: boolean;
  permitir_lembretes: boolean;
  busca_treinamento: boolean;
  timezone: string;
  tempo_resposta: number;
  limite_interacoes: number;
  acoes_followup: AcaoFollowUp[];
  palavras_chave_transferencia: string[];
  fila_transferencia_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OmniIATreinamento {
  id: string;
  agente_id: string;
  clinica_id: string;
  tipo: "texto" | "website" | "video" | "documento";
  conteudo: string;
  status: "pendente" | "treinado" | "erro";
  created_at: string;
}

export interface OmniIAIntencao {
  id: string;
  agente_id: string;
  clinica_id: string;
  nome: string;
  webhook_url: string;
  descricao: string | null;
  ativa: boolean;
  created_at: string;
}

export function useOmniIAAgentes(clinicaId: string | null) {
  const [agentes, setAgentes] = useState<OmniIAAgente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgentes = useCallback(async () => {
    if (!clinicaId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("omni_ia_agentes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast the data properly
      const typedAgentes = (data || []).map((a: any) => ({
        ...a,
        acoes_followup: (a.acoes_followup || []) as AcaoFollowUp[],
        palavras_chave_transferencia: (a.palavras_chave_transferencia || []) as string[],
      })) as OmniIAAgente[];
      
      setAgentes(typedAgentes);
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      toast.error("Erro ao carregar agentes de IA");
    } finally {
      setLoading(false);
    }
  }, [clinicaId]);

  useEffect(() => {
    fetchAgentes();
  }, [fetchAgentes]);

  const criarAgente = async (nome: string): Promise<OmniIAAgente | null> => {
    if (!clinicaId) return null;

    try {
      const { data, error } = await supabase
        .from("omni_ia_agentes")
        .insert({
          clinica_id: clinicaId,
          nome,
          descricao: "Novo agente",
        })
        .select()
        .single();

      if (error) throw error;

      const novoAgente = {
        ...data,
        acoes_followup: [],
        palavras_chave_transferencia: [],
      } as OmniIAAgente;

      setAgentes((prev) => [novoAgente, ...prev]);
      toast.success("Agente criado com sucesso!");
      return novoAgente;
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error("Erro ao criar agente");
      return null;
    }
  };

  const atualizarAgente = async (agente: Partial<OmniIAAgente> & { id: string }): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (agente.nome !== undefined) updateData.nome = agente.nome;
      if (agente.descricao !== undefined) updateData.descricao = agente.descricao;
      if (agente.modelo !== undefined) updateData.modelo = agente.modelo;
      if (agente.avatar_url !== undefined) updateData.avatar_url = agente.avatar_url;
      if (agente.comunicacao !== undefined) updateData.comunicacao = agente.comunicacao;
      if (agente.comportamento !== undefined) updateData.comportamento = agente.comportamento;
      if (agente.finalidade !== undefined) updateData.finalidade = agente.finalidade;
      if (agente.produto !== undefined) updateData.produto = agente.produto;
      if (agente.site_url !== undefined) updateData.site_url = agente.site_url;
      if (agente.descricao_produto !== undefined) updateData.descricao_produto = agente.descricao_produto;
      if (agente.ativo !== undefined) updateData.ativo = agente.ativo;
      if (agente.fila_operacao_id !== undefined) updateData.fila_operacao_id = agente.fila_operacao_id;
      if (agente.transferir_para_humano !== undefined) updateData.transferir_para_humano = agente.transferir_para_humano;
      if (agente.usar_emojis !== undefined) updateData.usar_emojis = agente.usar_emojis;
      if (agente.assinar_nome !== undefined) updateData.assinar_nome = agente.assinar_nome;
      if (agente.restringir_temas !== undefined) updateData.restringir_temas = agente.restringir_temas;
      if (agente.dividir_resposta !== undefined) updateData.dividir_resposta = agente.dividir_resposta;
      if (agente.permitir_lembretes !== undefined) updateData.permitir_lembretes = agente.permitir_lembretes;
      if (agente.busca_treinamento !== undefined) updateData.busca_treinamento = agente.busca_treinamento;
      if (agente.timezone !== undefined) updateData.timezone = agente.timezone;
      if (agente.tempo_resposta !== undefined) updateData.tempo_resposta = agente.tempo_resposta;
      if (agente.limite_interacoes !== undefined) updateData.limite_interacoes = agente.limite_interacoes;
      if (agente.acoes_followup !== undefined) updateData.acoes_followup = JSON.parse(JSON.stringify(agente.acoes_followup));
      if (agente.palavras_chave_transferencia !== undefined) updateData.palavras_chave_transferencia = agente.palavras_chave_transferencia;
      if (agente.fila_transferencia_id !== undefined) updateData.fila_transferencia_id = agente.fila_transferencia_id;

      const { error } = await supabase
        .from("omni_ia_agentes")
        .update(updateData)
        .eq("id", agente.id);

      if (error) throw error;

      setAgentes((prev) =>
        prev.map((a) => (a.id === agente.id ? { ...a, ...agente } : a))
      );
      toast.success("Alterações salvas!");
      return true;
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error("Erro ao salvar alterações");
      return false;
    }
  };

  const excluirAgente = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_agentes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAgentes((prev) => prev.filter((a) => a.id !== id));
      toast.success("Agente excluído com sucesso!");
      return true;
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast.error("Erro ao excluir agente");
      return false;
    }
  };

  const toggleAgenteAtivo = async (id: string, ativo: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_agentes")
        .update({ ativo })
        .eq("id", id);

      if (error) throw error;

      setAgentes((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ativo } : a))
      );
      toast.success(ativo ? "Agente ativado!" : "Agente desativado!");
      return true;
    } catch (error) {
      console.error("Error toggling agent:", error);
      toast.error("Erro ao alterar status do agente");
      return false;
    }
  };

  return {
    agentes,
    loading,
    refetch: fetchAgentes,
    criarAgente,
    atualizarAgente,
    excluirAgente,
    toggleAgenteAtivo,
  };
}

export function useOmniIATreinamentos(agenteId: string | null, clinicaId: string | null) {
  const [treinamentos, setTreinamentos] = useState<OmniIATreinamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTreinamentos = useCallback(async () => {
    if (!agenteId || !clinicaId) {
      setTreinamentos([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("omni_ia_treinamentos")
        .select("*")
        .eq("agente_id", agenteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTreinamentos((data || []) as OmniIATreinamento[]);
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  }, [agenteId, clinicaId]);

  useEffect(() => {
    fetchTreinamentos();
  }, [fetchTreinamentos]);

  const criarTreinamento = async (
    tipo: OmniIATreinamento["tipo"],
    conteudo: string
  ): Promise<OmniIATreinamento | null> => {
    if (!agenteId || !clinicaId) return null;

    try {
      const { data, error } = await supabase
        .from("omni_ia_treinamentos")
        .insert({
          agente_id: agenteId,
          clinica_id: clinicaId,
          tipo,
          conteudo,
          status: "pendente",
        })
        .select()
        .single();

      if (error) throw error;

      const novoTreinamento = data as OmniIATreinamento;
      setTreinamentos((prev) => [novoTreinamento, ...prev]);
      toast.success("Treinamento cadastrado! Processando...");

      // Simular processamento de treinamento
      setTimeout(async () => {
        await supabase
          .from("omni_ia_treinamentos")
          .update({ status: "treinado" })
          .eq("id", novoTreinamento.id);

        setTreinamentos((prev) =>
          prev.map((t) =>
            t.id === novoTreinamento.id ? { ...t, status: "treinado" as const } : t
          )
        );
        toast.success("Treinamento concluído!");
      }, 2000);

      return novoTreinamento;
    } catch (error) {
      console.error("Error creating training:", error);
      toast.error("Erro ao cadastrar treinamento");
      return null;
    }
  };

  const atualizarTreinamento = async (
    id: string,
    conteudo: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_treinamentos")
        .update({ conteudo })
        .eq("id", id);

      if (error) throw error;

      setTreinamentos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, conteudo } : t))
      );
      toast.success("Treinamento atualizado!");
      return true;
    } catch (error) {
      console.error("Error updating training:", error);
      toast.error("Erro ao atualizar treinamento");
      return false;
    }
  };

  const excluirTreinamento = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_treinamentos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTreinamentos((prev) => prev.filter((t) => t.id !== id));
      toast.success("Treinamento excluído!");
      return true;
    } catch (error) {
      console.error("Error deleting training:", error);
      toast.error("Erro ao excluir treinamento");
      return false;
    }
  };

  const reprocessarTreinamento = async (id: string): Promise<boolean> => {
    try {
      await supabase
        .from("omni_ia_treinamentos")
        .update({ status: "pendente" })
        .eq("id", id);

      setTreinamentos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "pendente" as const } : t))
      );
      toast.info("Reprocessando treinamento...");

      setTimeout(async () => {
        await supabase
          .from("omni_ia_treinamentos")
          .update({ status: "treinado" })
          .eq("id", id);

        setTreinamentos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "treinado" as const } : t))
        );
        toast.success("Treinamento reprocessado!");
      }, 2000);

      return true;
    } catch (error) {
      console.error("Error reprocessing training:", error);
      toast.error("Erro ao reprocessar treinamento");
      return false;
    }
  };

  return {
    treinamentos,
    loading,
    refetch: fetchTreinamentos,
    criarTreinamento,
    atualizarTreinamento,
    excluirTreinamento,
    reprocessarTreinamento,
  };
}

export function useOmniIAIntencoes(agenteId: string | null, clinicaId: string | null) {
  const [intencoes, setIntencoes] = useState<OmniIAIntencao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIntencoes = useCallback(async () => {
    if (!agenteId || !clinicaId) {
      setIntencoes([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("omni_ia_intencoes")
        .select("*")
        .eq("agente_id", agenteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIntencoes((data || []) as OmniIAIntencao[]);
    } catch (error) {
      console.error("Error fetching intents:", error);
    } finally {
      setLoading(false);
    }
  }, [agenteId, clinicaId]);

  useEffect(() => {
    fetchIntencoes();
  }, [fetchIntencoes]);

  const criarIntencao = async (
    nome: string,
    webhook_url: string,
    descricao?: string
  ): Promise<OmniIAIntencao | null> => {
    if (!agenteId || !clinicaId) return null;

    try {
      const { data, error } = await supabase
        .from("omni_ia_intencoes")
        .insert({
          agente_id: agenteId,
          clinica_id: clinicaId,
          nome,
          webhook_url,
          descricao,
        })
        .select()
        .single();

      if (error) throw error;

      const novaIntencao = data as OmniIAIntencao;
      setIntencoes((prev) => [novaIntencao, ...prev]);
      toast.success("Intenção criada com sucesso!");
      return novaIntencao;
    } catch (error) {
      console.error("Error creating intent:", error);
      toast.error("Erro ao criar intenção");
      return null;
    }
  };

  const atualizarIntencao = async (
    id: string,
    dados: Partial<OmniIAIntencao>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_intencoes")
        .update(dados)
        .eq("id", id);

      if (error) throw error;

      setIntencoes((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...dados } : i))
      );
      toast.success("Intenção atualizada!");
      return true;
    } catch (error) {
      console.error("Error updating intent:", error);
      toast.error("Erro ao atualizar intenção");
      return false;
    }
  };

  const excluirIntencao = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_intencoes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setIntencoes((prev) => prev.filter((i) => i.id !== id));
      toast.success("Intenção excluída!");
      return true;
    } catch (error) {
      console.error("Error deleting intent:", error);
      toast.error("Erro ao excluir intenção");
      return false;
    }
  };

  const toggleIntencao = async (id: string, ativa: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("omni_ia_intencoes")
        .update({ ativa })
        .eq("id", id);

      if (error) throw error;

      setIntencoes((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ativa } : i))
      );
      return true;
    } catch (error) {
      console.error("Error toggling intent:", error);
      toast.error("Erro ao alterar status da intenção");
      return false;
    }
  };

  return {
    intencoes,
    loading,
    refetch: fetchIntencoes,
    criarIntencao,
    atualizarIntencao,
    excluirIntencao,
    toggleIntencao,
  };
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WacConexao {
  id: string;
  clinica_id: string | null;
  nome: string;
  waba_id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  verify_token: string | null;
  status: string;
  ultimo_erro: string | null;
  ultimo_teste_em: string | null;
  token_atualizado_em: string | null;
  ativo: boolean;
  created_at: string;
  tem_token?: boolean;
}

export interface WacConversa {
  id: string;
  conexao_id: string;
  contato_id: string;
  status: string;
  ultima_mensagem: string | null;
  ultima_mensagem_em: string | null;
  nao_lidas: number;
  janela_expira_em: string | null;
  contato?: { id: string; wa_id: string; nome: string | null; foto_url: string | null } | null;
}

export interface WacMensagem {
  id: string;
  conversa_id: string;
  wamid: string | null;
  direcao: "entrada" | "saida" | string;
  tipo: string;
  conteudo: string | null;
  media_url: string | null;
  media_mime: string | null;
  filename: string | null;
  template_nome: string | null;
  status: string | null;
  erro: string | null;
  timestamp_meta: string | null;
  created_at: string;
}

type AdminAction =
  | "list"
  | "create"
  | "update"
  | "delete"
  | "test"
  | "templates";

export function useWhatsAppCloud() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId ?? null;

  const [conexoes, setConexoes] = useState<WacConexao[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const callAdmin = useCallback(
    async (action: AdminAction, payload: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("wac-admin", {
        body: {
          action,
          usuario_id: currentUser?.id,
          clinica_id: clinicaId,
          ...payload,
        },
      });
      if (error) throw new Error(error.message);
      return data as Record<string, any>;
    },
    [currentUser?.id, clinicaId],
  );

  const carregarConexoes = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await callAdmin("list");
      if (!res?.ok) throw new Error(res?.message ?? "Falha ao carregar conexões");
      setConexoes(res.conexoes ?? []);
      setWebhookUrl(res.webhook_url ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar conexões");
    } finally {
      setLoading(false);
    }
  }, [callAdmin, currentUser?.id]);

  useEffect(() => {
    carregarConexoes();
  }, [carregarConexoes]);

  const salvarConexao = useCallback(
    async (payload: {
      conexao_id?: string;
      nome: string;
      waba_id: string;
      phone_number_id: string;
      access_token?: string;
      verify_token?: string;
      ativo?: boolean;
    }) => {
      const action = payload.conexao_id ? "update" : "create";
      const res = await callAdmin(action, payload);
      if (!res?.ok) throw new Error(res?.message ?? "Falha ao salvar conexão");
      await carregarConexoes();
      return res;
    },
    [callAdmin, carregarConexoes],
  );

  const removerConexao = useCallback(
    async (conexaoId: string) => {
      const res = await callAdmin("delete", { conexao_id: conexaoId });
      if (!res?.ok) throw new Error(res?.message ?? "Falha ao remover conexão");
      await carregarConexoes();
    },
    [callAdmin, carregarConexoes],
  );

  const testarConexao = useCallback(
    async (conexaoId: string) => {
      const res = await callAdmin("test", { conexao_id: conexaoId });
      await carregarConexoes();
      return res;
    },
    [callAdmin, carregarConexoes],
  );

  const listarTemplates = useCallback(
    async (conexaoId: string) => {
      const res = await callAdmin("templates", { conexao_id: conexaoId });
      if (!res?.ok) throw new Error(res?.message ?? "Falha ao buscar modelos");
      return (res.templates ?? []) as Array<{
        name: string;
        status: string;
        language: string;
        category: string;
      }>;
    },
    [callAdmin],
  );

  const conexoesAtivas = useMemo(() => conexoes.filter((c) => c.ativo), [conexoes]);

  return {
    clinicaId,
    conexoes,
    conexoesAtivas,
    webhookUrl,
    loading,
    carregarConexoes,
    salvarConexao,
    removerConexao,
    testarConexao,
    listarTemplates,
  };
}

export function useWacInbox(conexaoId: string | null) {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId ?? null;

  const [conversas, setConversas] = useState<WacConversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<WacMensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregarConversas = useCallback(async () => {
    if (!conexaoId) {
      setConversas([]);
      return;
    }
    const { data, error } = await supabase
      .from("wac_conversas")
      .select("*, contato:wac_contatos(id, wa_id, nome, foto_url)")
      .eq("conexao_id", conexaoId)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) {
      toast.error("Erro ao carregar conversas");
      return;
    }
    setConversas((data ?? []) as unknown as WacConversa[]);
  }, [conexaoId]);

  const carregarMensagens = useCallback(async (conversaId: string) => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("wac_mensagens")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("created_at", { ascending: true })
      .limit(500);
    setCarregando(false);
    if (error) {
      toast.error("Erro ao carregar mensagens");
      return;
    }
    setMensagens((data ?? []) as unknown as WacMensagem[]);
    await supabase.from("wac_conversas").update({ nao_lidas: 0 }).eq("id", conversaId);
  }, []);

  useEffect(() => {
    setConversaAtiva(null);
    setMensagens([]);
    carregarConversas();
  }, [carregarConversas]);

  useEffect(() => {
    if (conversaAtiva) carregarMensagens(conversaAtiva);
  }, [conversaAtiva, carregarMensagens]);

  // Realtime: novas mensagens e atualizações de status
  useEffect(() => {
    if (!conexaoId) return;
    const channel = supabase
      .channel(`wac-inbox-${conexaoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wac_mensagens", filter: `conexao_id=eq.${conexaoId}` },
        (payload) => {
          const row = payload.new as unknown as WacMensagem;
          if (!row) return;
          setMensagens((prev) => {
            if (row.conversa_id !== conversaAtiva) return prev;
            const idx = prev.findIndex((m) => m.id === row.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = row;
              return next;
            }
            return [...prev, row];
          });
          carregarConversas();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wac_conversas", filter: `conexao_id=eq.${conexaoId}` },
        () => carregarConversas(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conexaoId, conversaAtiva, carregarConversas]);

  const enviar = useCallback(
    async (payload: {
      to?: string;
      tipo?: "text" | "image" | "document" | "audio" | "video" | "template";
      texto?: string;
      link?: string;
      filename?: string;
      caption?: string;
      template_nome?: string;
      template_idioma?: string;
    }) => {
      if (!conexaoId) {
        toast.error("Selecione um número conectado");
        return false;
      }
      setEnviando(true);
      try {
        const { data, error } = await supabase.functions.invoke("wac-send", {
          body: {
            usuario_id: currentUser?.id,
            clinica_id: clinicaId,
            conexao_id: conexaoId,
            conversa_id: conversaAtiva ?? undefined,
            ...payload,
          },
        });
        if (error) throw new Error(error.message);
        if (!data?.ok) throw new Error(data?.message ?? "Falha no envio");
        if (!conversaAtiva && data.conversa_id) setConversaAtiva(data.conversa_id);
        await carregarConversas();
        if (data.conversa_id) await carregarMensagens(data.conversa_id);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao enviar mensagem");
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [conexaoId, conversaAtiva, currentUser?.id, clinicaId, carregarConversas, carregarMensagens],
  );

  return {
    conversas,
    conversaAtiva,
    setConversaAtiva,
    mensagens,
    carregando,
    enviando,
    enviar,
    carregarConversas,
  };
}

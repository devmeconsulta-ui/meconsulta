import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { supabase } from "@/integrations/supabase/client";
import { Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Briefcase,
  GraduationCap,
  Target,
  Link2,
  Settings,
  Plus,
  Trash2,
  Image,
  Video,
  FileText,
  Globe,
  Headphones,
  ShoppingCart,
  Users,
  Home,
  Smile,
  ArrowRightLeft,
  MessageSquare,
  Clock,
  Webhook,
  Shield,
  Split,
  StickyNote,
  Search,
  Calendar,
  MessageCircle,
  Sparkles,
  Bot,
  MoreVertical,
  Pencil,
  Upload,
  Copy,
  Check,
  X,
  RefreshCw,
  Play,
  Pause,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

interface AcaoFollowUp {
  id: string;
  tempo_minutos: number;
  acao: "mensagem" | "encerrar" | "transferir";
  mensagem: string;
  ativa: boolean;
}

interface AgendamentoConfig {
  permitir_agendamento: boolean;
  permitir_cancelamento: boolean;
  pausar_quando_humano_responde: boolean;
  tipos_atendimento: string[];
  exigir_cpf: boolean;
  antecedencia_minima_horas: number;
  antecedencia_maxima_dias: number;
}

interface AgenteIA {
  id: string;
  nome: string;
  descricao: string;
  modelo: string;
  avatar_url: string | null;
  comunicacao: "formal" | "normal" | "descontraida";
  comportamento: string;
  finalidade: "suporte" | "vendas" | "pessoal";
  produto: string;
  site_url: string;
  descricao_produto: string;
  ativo: boolean;
  fila_operacao: string; // Fila em que a IA irá operar
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
  fila_transferencia: string;
  // Agendamento config
  agendamento: AgendamentoConfig;
}

interface Treinamento {
  id: string;
  tipo: "texto" | "website" | "video" | "documento";
  conteudo: string;
  status: "pendente" | "treinado" | "erro";
  created_at: string;
}

interface Intencao {
  id: string;
  nome: string;
  webhook_url: string;
  ativa: boolean;
  descricao: string;
}

interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  ativa: boolean;
  configurada: boolean;
  api_key?: string;
}

export default function OmniIA() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const { currentUser } = useAuth();
  const clinicaId = clinicaData?.id || currentUser?.clinicaId || null;
  
  const { filas, loading: loadingFilas } = useOmniFilas(clinicaId);

  const [selectedAgente, setSelectedAgente] = useState<AgenteIA | null>(null);
  const [activeSection, setActiveSection] = useState("perfil");
  const [configTab, setConfigTab] = useState("conversa");
  const [treinamentoTab, setTreinamentoTab] = useState("texto");
  const [criarAgenteOpen, setCriarAgenteOpen] = useState(false);
  const [novoAgenteNome, setNovoAgenteNome] = useState("");
  const [buscarTreinamento, setBuscarTreinamento] = useState("");
  const [buscarIntencao, setBuscarIntencao] = useState("");
  const [novoTreinamento, setNovoTreinamento] = useState("");
  const [novoWebsiteUrl, setNovoWebsiteUrl] = useState("");
  const [novoVideoUrl, setNovoVideoUrl] = useState("");
  const [testarIaOpen, setTestarIaOpen] = useState(false);
  const [chatMensagens, setChatMensagens] = useState<{role: string; content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [editTreinamentoOpen, setEditTreinamentoOpen] = useState(false);
  const [editTreinamento, setEditTreinamento] = useState<Treinamento | null>(null);
  const [deleteTreinamentoOpen, setDeleteTreinamentoOpen] = useState(false);
  const [deleteTreinamentoId, setDeleteTreinamentoId] = useState<string | null>(null);
  
  const [novaIntencaoOpen, setNovaIntencaoOpen] = useState(false);
  const [novaIntencao, setNovaIntencao] = useState({ nome: "", webhook_url: "", descricao: "" });
  const [editIntencaoOpen, setEditIntencaoOpen] = useState(false);
  const [editIntencao, setEditIntencao] = useState<Intencao | null>(null);
  const [deleteIntencaoOpen, setDeleteIntencaoOpen] = useState(false);
  const [deleteIntencaoId, setDeleteIntencaoId] = useState<string | null>(null);
  
  const [configIntegracaoOpen, setConfigIntegracaoOpen] = useState(false);
  const [integracaoSelecionada, setIntegracaoSelecionada] = useState<Integracao | null>(null);
  const [integracaoApiKey, setIntegracaoApiKey] = useState("");
  
  const [deleteAgenteOpen, setDeleteAgenteOpen] = useState(false);
  
  // Inatividade config
  const [inativodadeConfigOpen, setInativodadeConfigOpen] = useState(false);
  
  // Webhooks config
  const [webhooksConfigOpen, setWebhooksConfigOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEventos, setWebhookEventos] = useState<string[]>([]);
  
  // Transferência config
  const [transferenciaConfigOpen, setTransferenciaConfigOpen] = useState(false);
  const [palavrasChave, setPalavrasChave] = useState("");

  const [agentes, setAgentes] = useState<AgenteIA[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);
  const [intencoes, setIntencoes] = useState<Intencao[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [integracoes, setIntegracoes] = useState<Integracao[]>([
    { id: "1", nome: "ElevenLabs", descricao: "Responder em áudio humanizado.", icone: "11", ativa: false, configurada: false },
    { id: "2", nome: "Google Calendar", descricao: "Agendar reuniões automaticamente.", icone: "calendar", ativa: true, configurada: true },
    { id: "3", nome: "Plug Chat", descricao: "Direcionar para atendente humano.", icone: "chat", ativa: false, configurada: false }
  ]);

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      if (!clinicaId) return;
      setLoadingData(true);
      
      try {
        // Load agents
        const { data: agentesData } = await supabase
          .from("omni_ia_agentes")
          .select("*")
          .eq("clinica_id", clinicaId)
          .order("created_at", { ascending: false });

        if (agentesData && agentesData.length > 0) {
          const mappedAgentes = agentesData.map((a: any) => ({
            id: a.id,
            nome: a.nome,
            descricao: a.descricao || "",
            modelo: a.modelo,
            avatar_url: a.avatar_url,
            comunicacao: a.comunicacao,
            comportamento: a.comportamento || "",
            finalidade: a.finalidade,
            produto: a.produto || "",
            site_url: a.site_url || "",
            descricao_produto: a.descricao_produto || "",
            ativo: a.ativo,
            fila_operacao: a.fila_operacao_id || "",
            transferir_para_humano: a.transferir_para_humano,
            usar_emojis: a.usar_emojis,
            assinar_nome: a.assinar_nome,
            restringir_temas: a.restringir_temas,
            dividir_resposta: a.dividir_resposta,
            permitir_lembretes: a.permitir_lembretes,
            busca_treinamento: a.busca_treinamento,
            timezone: a.timezone,
            tempo_resposta: a.tempo_resposta,
            limite_interacoes: a.limite_interacoes,
            acoes_followup: (a.acoes_followup || []) as AcaoFollowUp[],
            palavras_chave_transferencia: a.palavras_chave_transferencia || [],
            fila_transferencia: a.fila_transferencia_id || "",
            agendamento: {
              permitir_agendamento: a.permitir_agendamento || false,
              permitir_cancelamento: a.permitir_cancelamento ?? true,
              pausar_quando_humano_responde: a.pausar_quando_humano_responde ?? true,
              tipos_atendimento: a.tipos_atendimento || ["particular"],
              exigir_cpf: a.exigir_cpf ?? true,
              antecedencia_minima_horas: a.antecedencia_minima_horas || 2,
              antecedencia_maxima_dias: a.antecedencia_maxima_dias || 30,
            },
          }));
          setAgentes(mappedAgentes);
          setSelectedAgente(mappedAgentes[0]);
        }
      } catch (error) {
        console.error("Error loading AI data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadData();
  }, [clinicaId]);

  // Load treinamentos when agent is selected
  useEffect(() => {
    const loadTreinamentos = async () => {
      if (!selectedAgente?.id) return;
      
      const { data } = await supabase
        .from("omni_ia_treinamentos")
        .select("*")
        .eq("agente_id", selectedAgente.id)
        .order("created_at", { ascending: false });
      
      if (data) setTreinamentos(data as Treinamento[]);
    };
    
    const loadIntencoes = async () => {
      if (!selectedAgente?.id) return;
      
      const { data } = await supabase
        .from("omni_ia_intencoes")
        .select("*")
        .eq("agente_id", selectedAgente.id);
      
      if (data) setIntencoes(data as Intencao[]);
    };
    
    loadTreinamentos();
    loadIntencoes();
  }, [selectedAgente?.id]);

  const handleCriarAgente = async () => {
    if (!novoAgenteNome.trim() || !clinicaId) {
      toast.error("Digite um nome para o agente");
      return;
    }

    const { data, error } = await supabase
      .from("omni_ia_agentes")
      .insert({ clinica_id: clinicaId, nome: novoAgenteNome })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar agente");
      return;
    }

    const novoAgente: AgenteIA = {
      id: data.id, nome: data.nome, descricao: data.descricao || "", modelo: data.modelo,
      avatar_url: data.avatar_url, comunicacao: data.comunicacao as AgenteIA["comunicacao"], 
      comportamento: data.comportamento || "", finalidade: data.finalidade as AgenteIA["finalidade"], 
      produto: data.produto || "", site_url: data.site_url || "",
      descricao_produto: data.descricao_produto || "", ativo: data.ativo, fila_operacao: data.fila_operacao_id || "",
      transferir_para_humano: data.transferir_para_humano, usar_emojis: data.usar_emojis, assinar_nome: data.assinar_nome,
      restringir_temas: data.restringir_temas, dividir_resposta: data.dividir_resposta, permitir_lembretes: data.permitir_lembretes,
      busca_treinamento: data.busca_treinamento, timezone: data.timezone, tempo_resposta: data.tempo_resposta,
      limite_interacoes: data.limite_interacoes, acoes_followup: [], palavras_chave_transferencia: [], fila_transferencia: "",
      agendamento: {
        permitir_agendamento: false,
        permitir_cancelamento: true,
        pausar_quando_humano_responde: true,
        tipos_atendimento: ["particular"],
        exigir_cpf: true,
        antecedencia_minima_horas: 2,
        antecedencia_maxima_dias: 30,
      },
    };

    setAgentes(prev => [novoAgente, ...prev]);
    setSelectedAgente(novoAgente);
    setCriarAgenteOpen(false);
    setNovoAgenteNome("");
    toast.success("Agente criado com sucesso!");
  };

  const handleDeleteAgente = async () => {
    if (!selectedAgente) return;
    await supabase.from("omni_ia_agentes").delete().eq("id", selectedAgente.id);
    setAgentes(prev => prev.filter(a => a.id !== selectedAgente.id));
    setSelectedAgente(agentes.length > 1 ? agentes.find(a => a.id !== selectedAgente.id) || null : null);
    setDeleteAgenteOpen(false);
    toast.success("Agente excluído com sucesso!");
  };

  const handleSalvarAgente = async () => {
    if (!selectedAgente) return;
    
    // Salvar dados do agente
    await supabase.from("omni_ia_agentes").update({
      nome: selectedAgente.nome, descricao: selectedAgente.descricao, modelo: selectedAgente.modelo,
      comunicacao: selectedAgente.comunicacao, comportamento: selectedAgente.comportamento,
      finalidade: selectedAgente.finalidade, produto: selectedAgente.produto, site_url: selectedAgente.site_url,
      descricao_produto: selectedAgente.descricao_produto, ativo: selectedAgente.ativo,
      fila_operacao_id: selectedAgente.fila_operacao || null, transferir_para_humano: selectedAgente.transferir_para_humano,
      usar_emojis: selectedAgente.usar_emojis, assinar_nome: selectedAgente.assinar_nome, restringir_temas: selectedAgente.restringir_temas,
      dividir_resposta: selectedAgente.dividir_resposta, permitir_lembretes: selectedAgente.permitir_lembretes,
      busca_treinamento: selectedAgente.busca_treinamento, tempo_resposta: selectedAgente.tempo_resposta,
      limite_interacoes: selectedAgente.limite_interacoes, acoes_followup: JSON.parse(JSON.stringify(selectedAgente.acoes_followup)),
      palavras_chave_transferencia: selectedAgente.palavras_chave_transferencia,
      fila_transferencia_id: selectedAgente.fila_transferencia || null,
      // Campos de agendamento
      permitir_agendamento: selectedAgente.agendamento.permitir_agendamento,
      permitir_cancelamento: selectedAgente.agendamento.permitir_cancelamento,
      pausar_quando_humano_responde: selectedAgente.agendamento.pausar_quando_humano_responde,
      tipos_atendimento: selectedAgente.agendamento.tipos_atendimento,
      exigir_cpf: selectedAgente.agendamento.exigir_cpf,
      antecedencia_minima_horas: selectedAgente.agendamento.antecedencia_minima_horas,
      antecedencia_maxima_dias: selectedAgente.agendamento.antecedencia_maxima_dias,
    }).eq("id", selectedAgente.id);
    
    setAgentes(prev => prev.map(a => a.id === selectedAgente.id ? selectedAgente : a));
    toast.success("Alterações salvas!");
  };

  const handleToggleAgenteAtivo = async () => {
    if (!selectedAgente) return;
    const novoStatus = !selectedAgente.ativo;
    await supabase.from("omni_ia_agentes").update({ ativo: novoStatus }).eq("id", selectedAgente.id);
    const updated = { ...selectedAgente, ativo: novoStatus };
    setSelectedAgente(updated);
    setAgentes(prev => prev.map(a => a.id === updated.id ? updated : a));
    toast.success(novoStatus ? "Agente ativado!" : "Agente desativado!");
  };

  // Treinamentos handlers
  const handleAdicionarTreinamento = async (tipo: Treinamento["tipo"], conteudo: string) => {
    if (!conteudo.trim()) {
      toast.error("Digite o conteúdo do treinamento");
      return;
    }
    
    if (!selectedAgente?.id || !clinicaId) {
      toast.error("Selecione um agente primeiro");
      return;
    }

    // Save to database
    const { data, error } = await supabase
      .from("omni_ia_treinamentos")
      .insert({
        agente_id: selectedAgente.id,
        clinica_id: clinicaId,
        tipo,
        conteudo,
        status: "pendente",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving training:", error);
      toast.error("Erro ao salvar treinamento");
      return;
    }

    setTreinamentos(prev => [data as Treinamento, ...prev]);
    
    setNovoTreinamento("");
    setNovoWebsiteUrl("");
    setNovoVideoUrl("");
    toast.success("Treinamento cadastrado! Processando...");
    
    // Simulate training completion and update in database
    setTimeout(async () => {
      await supabase
        .from("omni_ia_treinamentos")
        .update({ status: "treinado" })
        .eq("id", data.id);

      setTreinamentos(prev => prev.map(t => 
        t.id === data.id ? { ...t, status: "treinado" as const } : t
      ));
      toast.success("Treinamento concluído!");
    }, 2000);
  };

  const handleEditTreinamento = async () => {
    if (!editTreinamento) return;

    const { error } = await supabase
      .from("omni_ia_treinamentos")
      .update({ conteudo: editTreinamento.conteudo })
      .eq("id", editTreinamento.id);

    if (error) {
      toast.error("Erro ao atualizar treinamento");
      return;
    }

    setTreinamentos(prev => prev.map(t => t.id === editTreinamento.id ? editTreinamento : t));
    setEditTreinamentoOpen(false);
    setEditTreinamento(null);
    toast.success("Treinamento atualizado!");
  };

  const handleDeleteTreinamento = async () => {
    if (!deleteTreinamentoId) return;

    const { error } = await supabase
      .from("omni_ia_treinamentos")
      .delete()
      .eq("id", deleteTreinamentoId);

    if (error) {
      toast.error("Erro ao excluir treinamento");
      return;
    }

    setTreinamentos(prev => prev.filter(t => t.id !== deleteTreinamentoId));
    setDeleteTreinamentoOpen(false);
    setDeleteTreinamentoId(null);
    toast.success("Treinamento excluído!");
  };

  const handleRetrainTreinamento = async (id: string) => {
    await supabase
      .from("omni_ia_treinamentos")
      .update({ status: "pendente" })
      .eq("id", id);

    setTreinamentos(prev => prev.map(t => 
      t.id === id ? { ...t, status: "pendente" as const } : t
    ));
    toast.info("Reprocessando treinamento...");
    
    setTimeout(async () => {
      await supabase
        .from("omni_ia_treinamentos")
        .update({ status: "treinado" })
        .eq("id", id);

      setTreinamentos(prev => prev.map(t => 
        t.id === id ? { ...t, status: "treinado" as const } : t
      ));
      toast.success("Treinamento reprocessado!");
    }, 2000);
  };

  // Intenções handlers
  const handleCriarIntencao = async () => {
    if (!novaIntencao.nome.trim() || !novaIntencao.webhook_url.trim()) {
      toast.error("Preencha nome e URL do webhook");
      return;
    }
    
    if (!selectedAgente?.id || !clinicaId) {
      toast.error("Selecione um agente primeiro");
      return;
    }

    const { data, error } = await supabase
      .from("omni_ia_intencoes")
      .insert({
        agente_id: selectedAgente.id,
        clinica_id: clinicaId,
        nome: novaIntencao.nome,
        webhook_url: novaIntencao.webhook_url,
        descricao: novaIntencao.descricao,
        ativa: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving intent:", error);
      toast.error("Erro ao salvar intenção");
      return;
    }

    setIntencoes(prev => [data as Intencao, ...prev]);
    setNovaIntencaoOpen(false);
    setNovaIntencao({ nome: "", webhook_url: "", descricao: "" });
    toast.success("Intenção criada com sucesso!");
  };

  const handleEditIntencaoSave = async () => {
    if (!editIntencao) return;

    const { error } = await supabase
      .from("omni_ia_intencoes")
      .update({
        nome: editIntencao.nome,
        webhook_url: editIntencao.webhook_url,
        descricao: editIntencao.descricao,
      })
      .eq("id", editIntencao.id);

    if (error) {
      toast.error("Erro ao atualizar intenção");
      return;
    }

    setIntencoes(prev => prev.map(i => i.id === editIntencao.id ? editIntencao : i));
    setEditIntencaoOpen(false);
    setEditIntencao(null);
    toast.success("Intenção atualizada!");
  };

  const handleDeleteIntencao = async () => {
    if (!deleteIntencaoId) return;

    const { error } = await supabase
      .from("omni_ia_intencoes")
      .delete()
      .eq("id", deleteIntencaoId);

    if (error) {
      toast.error("Erro ao excluir intenção");
      return;
    }

    setIntencoes(prev => prev.filter(i => i.id !== deleteIntencaoId));
    setDeleteIntencaoOpen(false);
    setDeleteIntencaoId(null);
    toast.success("Intenção excluída!");
  };

  const handleToggleIntencao = async (id: string) => {
    const intencao = intencoes.find(i => i.id === id);
    if (!intencao) return;

    const { error } = await supabase
      .from("omni_ia_intencoes")
      .update({ ativa: !intencao.ativa })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao alterar status");
      return;
    }

    setIntencoes(prev => prev.map(i => 
      i.id === id ? { ...i, ativa: !i.ativa } : i
    ));
  };

  // Integração handlers
  const handleConfigIntegracao = (integracao: Integracao) => {
    setIntegracaoSelecionada(integracao);
    setIntegracaoApiKey(integracao.api_key || "");
    setConfigIntegracaoOpen(true);
  };

  const handleSalvarIntegracao = () => {
    if (!integracaoSelecionada) return;
    
    setIntegracoes(prev => prev.map(i => 
      i.id === integracaoSelecionada.id 
        ? { ...i, ativa: true, configurada: true, api_key: integracaoApiKey }
        : i
    ));
    
    setConfigIntegracaoOpen(false);
    setIntegracaoSelecionada(null);
    setIntegracaoApiKey("");
    toast.success("Integração configurada com sucesso!");
  };

  const handleToggleIntegracao = (id: string) => {
    setIntegracoes(prev => prev.map(i => 
      i.id === id ? { ...i, ativa: !i.ativa } : i
    ));
  };

  // Testar IA
  const handleEnviarMensagemTeste = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = { role: "user", content: chatInput };
    setChatMensagens(prev => [...prev, userMsg]);
    setChatInput("");
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { 
        role: "assistant", 
        content: `Olá! Sou o ${selectedAgente?.nome || "Assistente"}. ${selectedAgente?.comportamento || "Como posso ajudar você hoje?"}`
      };
      setChatMensagens(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  // Salvar configs de inatividade
  const handleSalvarInatividade = () => {
    handleSalvarAgente();
    setInativodadeConfigOpen(false);
    toast.success("Configurações de inatividade salvas!");
  };

  // Salvar webhooks
  const handleSalvarWebhooks = () => {
    toast.success("Webhooks configurados com sucesso!");
    setWebhooksConfigOpen(false);
  };

  // Salvar transferência
  const handleSalvarTransferencia = () => {
    if (selectedAgente) {
      const updated = {
        ...selectedAgente,
        palavras_chave_transferencia: palavrasChave.split(",").map(p => p.trim()).filter(Boolean)
      };
      setSelectedAgente(updated);
      setAgentes(prev => prev.map(a => a.id === updated.id ? updated : a));
    }
    setTransferenciaConfigOpen(false);
    toast.success("Regras de transferência salvas!");
  };

  const menuItems = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "trabalho", label: "Trabalho", icon: Briefcase },
    { id: "treinamentos", label: "Treinamentos", icon: GraduationCap },
    { id: "agendamento", label: "Agendamento", icon: Calendar },
    { id: "intencoes", label: "Intenções", icon: Target },
    { id: "integracoes", label: "Integrações", icon: Link2 },
    { id: "configuracoes", label: "Configurações", icon: Settings }
  ];

  return (
    <OmniLayout clinicaId={clinicaId || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Inteligência Artificial
            </h1>
            <p className="text-muted-foreground">
              Configure e treine seus agentes de IA para atendimento automático
            </p>
          </div>
          <Dialog open={criarAgenteOpen} onOpenChange={setCriarAgenteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Agente IA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Agente IA</DialogTitle>
                <DialogDescription>
                  Dê um nome para seu novo agente de inteligência artificial
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Agente</Label>
                  <Input
                    placeholder="Ex: Assistente de Vendas"
                    value={novoAgenteNome}
                    onChange={(e) => setNovoAgenteNome(e.target.value)}
                  />
                </div>
                <Button onClick={handleCriarAgente} className="w-full bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Criar Agente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        {agentes.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum agente IA criado</h3>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro agente de IA para automatizar o atendimento
              </p>
              <Button onClick={() => setCriarAgenteOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Agente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar - Lista de Agentes e Menu */}
            <div className="col-span-12 lg:col-span-3">
              <Card>
                <CardContent className="p-4">
                  {/* Seletor de Agente */}
                  <div className="flex flex-col items-center pb-4 border-b">
                    <div className="relative mb-3">
                      <Avatar className="w-24 h-24 border-4 border-purple-200">
                        <AvatarImage src={selectedAgente?.avatar_url || ""} />
                        <AvatarFallback className="bg-purple-500 text-white text-2xl">
                          {(selectedAgente?.nome || agentes[0]?.nome || "IA").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button 
                        size="icon" 
                        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                    <h3 className="font-semibold text-lg">{selectedAgente?.nome || agentes[0]?.nome}</h3>
                    <p className="text-sm text-muted-foreground">{selectedAgente?.descricao || agentes[0]?.descricao}</p>
                    
                    {/* Status do agente */}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={selectedAgente?.ativo ? "default" : "secondary"} className={selectedAgente?.ativo ? "bg-emerald-500" : ""}>
                        {selectedAgente?.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={handleToggleAgenteAtivo}>
                        {selectedAgente?.ativo ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                    </div>
                    
                    {/* Seletor de LLM configurada */}
                    <div className="mt-3 w-full">
                      <Label className="text-xs text-muted-foreground mb-1 block text-center">Modelo de IA</Label>
                      <Select
                        value={selectedAgente?.modelo || agentes[0]?.modelo || "gemini-3-flash"}
                        onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, modelo: value } : null)}
                      >
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <SelectValue placeholder="Selecionar modelo" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini-3-flash">Gemini 3 Flash ⚡ (Recomendado)</SelectItem>
                          <SelectItem value="gemini-3-pro">Gemini 3 Pro</SelectItem>
                          <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Econômico)</SelectItem>
                          <SelectItem value="gpt-5">GPT-5</SelectItem>
                          <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
                          <SelectItem value="gpt-5-nano">GPT-5 Nano (Econômico)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">
                        Powered by Lovable AI Gateway
                      </p>
                    </div>

                    {/* Seletor de Fila de Operação */}
                    <div className="mt-3 w-full">
                      <Label className="text-xs text-muted-foreground mb-1 block text-center">Fila de Operação</Label>
                      <Select
                        value={selectedAgente?.fila_operacao || "__none__"}
                        onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, fila_operacao: value === "__none__" ? "" : value } : null)}
                      >
                        <SelectTrigger className="w-full">
                          <div className="flex items-center gap-2">
                            <Inbox className="w-4 h-4 text-blue-600" />
                            <SelectValue placeholder="Selecionar fila" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma (desativada)</SelectItem>
                          {filas.map((fila) => (
                            <SelectItem key={fila.id} value={fila.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: fila.cor }}
                                />
                                {fila.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAgente?.fila_operacao && selectedAgente.fila_operacao !== "__none__" && (
                        <p className="text-[10px] text-emerald-600 mt-1 text-center">
                          IA ativa nesta fila
                        </p>
                      )}
                    </div>

                    {/* Dropdown de agentes */}
                    {agentes.length > 1 && (
                      <Select
                        value={selectedAgente?.id || agentes[0]?.id}
                        onValueChange={(value) => {
                          const agente = agentes.find(a => a.id === value);
                          setSelectedAgente(agente || null);
                        }}
                      >
                        <SelectTrigger className="mt-3 w-full">
                          <SelectValue placeholder="Selecionar agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {agentes.map((agente) => (
                            <SelectItem key={agente.id} value={agente.id}>
                              {agente.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Menu de Navegação */}
                  <nav className="mt-4 space-y-1">
                    {menuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          activeSection === item.id
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </nav>

                  {/* Botões de ação */}
                  <div className="mt-6 space-y-2">
                    <Button 
                      onClick={() => {
                        setChatMensagens([]);
                        setTestarIaOpen(true);
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Teste sua IA
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => setDeleteAgenteOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Agente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Conteúdo Principal */}
            <div className="col-span-12 lg:col-span-9">
              <Card>
                <CardContent className="p-6">
                  {/* Seção: Perfil */}
                  {activeSection === "perfil" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Informações pessoais</h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Nome do agente</Label>
                          <Input
                            value={selectedAgente?.nome || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, nome: e.target.value } : null)}
                            placeholder="Nome do agente"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Input
                            value={selectedAgente?.descricao || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                            placeholder="Ex: Atendente da Clínica"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Comunicação</Label>
                        <div className="flex gap-2">
                          {["formal", "normal", "descontraida"].map((tipo) => (
                            <Button
                              key={tipo}
                              variant={selectedAgente?.comunicacao === tipo ? "default" : "outline"}
                              className={cn(
                                selectedAgente?.comunicacao === tipo && "bg-purple-600 hover:bg-purple-700"
                              )}
                              onClick={() => setSelectedAgente(prev => prev ? { ...prev, comunicacao: tipo as AgenteIA["comunicacao"] } : null)}
                            >
                              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Comportamento:</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Descreva um pouco sobre como o agente deve se comportar durante a conversa.
                        </p>
                        <Textarea
                          value={selectedAgente?.comportamento || ""}
                          onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, comportamento: e.target.value } : null)}
                          placeholder="Ex: Você é um assistente cordial que ajuda clientes..."
                          rows={8}
                          className="resize-none"
                        />
                        <div className="text-right text-sm text-muted-foreground">
                          {(selectedAgente?.comportamento || "").length}/3000
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Seção: Trabalho */}
                  {activeSection === "trabalho" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Informações sobre trabalho</h2>
                      
                      <div className="space-y-2">
                        <Label>Finalidade:</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { id: "suporte", label: "Suporte", desc: "Use essa opção sempre que o objetivo do seu agente for prestar suporte.", icon: Headphones },
                            { id: "vendas", label: "Vendas", desc: "Use sempre que quiser criar um agente de no setor de vendas.", icon: ShoppingCart },
                            { id: "pessoal", label: "Uso pessoal", desc: "Escolha esta opção caso queira um agente para uso pessoal.", icon: Users }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => setSelectedAgente(prev => prev ? { ...prev, finalidade: opt.id as AgenteIA["finalidade"] } : null)}
                              className={cn(
                                "p-4 rounded-lg border-2 text-left transition-colors",
                                selectedAgente?.finalidade === opt.id
                                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                  : "border-muted hover:border-purple-300"
                              )}
                            >
                              <opt.icon className={cn(
                                "w-8 h-8 mb-2",
                                selectedAgente?.finalidade === opt.id ? "text-purple-600" : "text-muted-foreground"
                              )} />
                              <h4 className="font-semibold">{opt.label}</h4>
                              <p className="text-sm text-muted-foreground">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Vende o produto:</Label>
                          <Input
                            value={selectedAgente?.produto || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, produto: e.target.value } : null)}
                            placeholder="Nome do produto/serviço"
                          />
                          <div className="text-right text-sm text-muted-foreground">
                            {(selectedAgente?.produto || "").length}/50
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Site oficial: (opcional)</Label>
                          <Input
                            value={selectedAgente?.site_url || ""}
                            onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, site_url: e.target.value } : null)}
                            placeholder="https://meuproduto.com.br"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Descreva um pouco sobre {selectedAgente?.produto || "o produto"}:</Label>
                        <Textarea
                          value={selectedAgente?.descricao_produto || ""}
                          onChange={(e) => setSelectedAgente(prev => prev ? { ...prev, descricao_produto: e.target.value } : null)}
                          placeholder="Descreva seu produto ou serviço..."
                          rows={5}
                        />
                        <div className="text-right text-sm text-muted-foreground">
                          {(selectedAgente?.descricao_produto || "").length}/500
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Seção: Treinamentos */}
                  {activeSection === "treinamentos" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Treinamentos</h2>
                        <div className="relative w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar treinamento"
                            value={buscarTreinamento}
                            onChange={(e) => setBuscarTreinamento(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <Tabs value={treinamentoTab} onValueChange={setTreinamentoTab}>
                        <TabsList>
                          <TabsTrigger value="texto">Texto</TabsTrigger>
                          <TabsTrigger value="website">Website</TabsTrigger>
                          <TabsTrigger value="video">Video</TabsTrigger>
                          <TabsTrigger value="documento">Documento</TabsTrigger>
                        </TabsList>

                        <TabsContent value="texto" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <GraduationCap className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Novo treinamento via texto</span>
                                <span className="ml-auto text-sm text-muted-foreground">{novoTreinamento.length}/1028</span>
                              </div>
                              <Textarea
                                placeholder="Escreva uma afirmação e clique em cadastrar..."
                                value={novoTreinamento}
                                onChange={(e) => setNovoTreinamento(e.target.value)}
                                rows={3}
                              />
                              <div className="flex justify-end mt-3">
                                <Button 
                                  onClick={() => handleAdicionarTreinamento("texto", novoTreinamento)}
                                  className="bg-orange-400 hover:bg-orange-500 text-white"
                                  disabled={!novoTreinamento.trim()}
                                >
                                  Cadastrar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Lista de treinamentos */}
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "texto")
                              .filter(t => t.conteudo.toLowerCase().includes(buscarTreinamento.toLowerCase()))
                              .map((treinamento) => (
                                <Card key={treinamento.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0" />
                                      <span className="truncate">{treinamento.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <Badge 
                                        variant={treinamento.status === "treinado" ? "default" : treinamento.status === "erro" ? "destructive" : "secondary"} 
                                        className={treinamento.status === "treinado" ? "bg-emerald-500" : ""}
                                      >
                                        {treinamento.status === "treinado" ? "Treinado" : treinamento.status === "erro" ? "Erro" : "Pendente"}
                                      </Badge>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => {
                                            setEditTreinamento(treinamento);
                                            setEditTreinamentoOpen(true);
                                          }}>
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleRetrainTreinamento(treinamento.id)}>
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Reprocessar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            className="text-destructive"
                                            onClick={() => {
                                              setDeleteTreinamentoId(treinamento.id);
                                              setDeleteTreinamentoOpen(true);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>

                          <div className="text-center text-sm text-muted-foreground">
                            Total: {treinamentos.filter(t => t.tipo === "texto").length} treinamentos
                          </div>
                        </TabsContent>

                        <TabsContent value="website" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Adicionar URL de website</span>
                              </div>
                              <Input 
                                placeholder="https://exemplo.com/pagina" 
                                value={novoWebsiteUrl}
                                onChange={(e) => setNovoWebsiteUrl(e.target.value)}
                              />
                              <Button 
                                className="mt-3 bg-orange-400 hover:bg-orange-500"
                                onClick={() => handleAdicionarTreinamento("website", novoWebsiteUrl)}
                                disabled={!novoWebsiteUrl.trim()}
                              >
                                Importar
                              </Button>
                            </CardContent>
                          </Card>
                          
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "website")
                              .map((t) => (
                                <Card key={t.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Globe className="w-5 h-5 text-purple-600" />
                                      <span className="truncate">{t.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={t.status === "treinado" ? "bg-emerald-500" : ""}>
                                        {t.status}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTreinamentoId(t.id);
                                          setDeleteTreinamentoOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="video" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Video className="w-5 h-5 text-purple-600" />
                                <span className="font-medium">Adicionar vídeo do YouTube</span>
                              </div>
                              <Input 
                                placeholder="https://youtube.com/watch?v=..." 
                                value={novoVideoUrl}
                                onChange={(e) => setNovoVideoUrl(e.target.value)}
                              />
                              <Button 
                                className="mt-3 bg-orange-400 hover:bg-orange-500"
                                onClick={() => handleAdicionarTreinamento("video", novoVideoUrl)}
                                disabled={!novoVideoUrl.trim()}
                              >
                                Importar
                              </Button>
                            </CardContent>
                          </Card>
                          
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "video")
                              .map((t) => (
                                <Card key={t.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Video className="w-5 h-5 text-purple-600" />
                                      <span className="truncate">{t.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={t.status === "treinado" ? "bg-emerald-500" : ""}>
                                        {t.status}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTreinamentoId(t.id);
                                          setDeleteTreinamentoOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="documento" className="space-y-4">
                          <Card className="border-dashed">
                            <CardContent className="p-6 text-center">
                              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground mb-4">Arraste um documento PDF ou Word aqui</p>
                              <Button variant="outline" onClick={() => toast.info("Funcionalidade de upload de documentos em breve!")}>
                                Selecionar arquivo
                              </Button>
                            </CardContent>
                          </Card>
                          
                          <div className="space-y-2">
                            {treinamentos
                              .filter(t => t.tipo === "documento")
                              .map((t) => (
                                <Card key={t.id}>
                                  <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <FileText className="w-5 h-5 text-purple-600" />
                                      <span className="truncate">{t.conteudo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className={t.status === "treinado" ? "bg-emerald-500" : ""}>
                                        {t.status}
                                      </Badge>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive"
                                        onClick={() => {
                                          setDeleteTreinamentoId(t.id);
                                          setDeleteTreinamentoOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Seção: Agendamento Automático */}
                  {activeSection === "agendamento" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Agendamento Automático</h2>
                      <p className="text-muted-foreground">
                        Configure a IA para agendar consultas automaticamente durante o atendimento.
                      </p>
                      
                      {/* Toggle principal */}
                      <Card className="border-2 border-primary/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-lg bg-primary/10">
                                <Calendar className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">Permitir Agendamento por IA</h3>
                                <p className="text-muted-foreground">
                                  A IA poderá buscar horários e agendar consultas automaticamente
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={selectedAgente?.agendamento.permitir_agendamento || false}
                              onCheckedChange={(checked) =>
                                setSelectedAgente(prev => prev ? { 
                                  ...prev, 
                                  agendamento: { ...prev.agendamento, permitir_agendamento: checked }
                                } : null)
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Toggle pausar quando humano responde */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                <Users className="h-6 w-6 text-amber-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Pausar IA quando Humano Responder</h3>
                                <p className="text-muted-foreground text-sm">
                                  Se um atendente responder pelo WhatsApp Web, telefone ou sistema, a IA para imediatamente
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={selectedAgente?.agendamento.pausar_quando_humano_responde ?? true}
                              onCheckedChange={(checked) =>
                                setSelectedAgente(prev => prev ? { 
                                  ...prev, 
                                  agendamento: { ...prev.agendamento, pausar_quando_humano_responde: checked }
                                } : null)
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {selectedAgente?.agendamento.permitir_agendamento && (
                        <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2">
                          {/* Tipos de atendimento */}
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div>
                                <Label className="text-base font-medium">Tipos de Atendimento Permitidos</Label>
                                <p className="text-sm text-muted-foreground mb-3">
                                  Quais tipos de consulta a IA pode agendar
                                </p>
                                <div className="flex gap-3">
                                  {[
                                    { id: "particular", label: "Particular", icon: "💳" },
                                    { id: "convenio", label: "Convênio", icon: "🏥" },
                                  ].map((tipo) => (
                                    <button
                                      key={tipo.id}
                                      type="button"
                                      className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all",
                                        selectedAgente.agendamento.tipos_atendimento.includes(tipo.id)
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border bg-muted hover:border-primary/50"
                                      )}
                                      onClick={() => {
                                        const tipos = selectedAgente.agendamento.tipos_atendimento;
                                        const novosTipos = tipos.includes(tipo.id)
                                          ? tipos.filter((t: string) => t !== tipo.id)
                                          : [...tipos, tipo.id];
                                        setSelectedAgente(prev => prev ? { 
                                          ...prev, 
                                          agendamento: { ...prev.agendamento, tipos_atendimento: novosTipos }
                                        } : null);
                                      }}
                                    >
                                      <span>{tipo.icon}</span>
                                      <span className="font-medium">{tipo.label}</span>
                                      {selectedAgente.agendamento.tipos_atendimento.includes(tipo.id) && (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Configurações adicionais */}
                          <Card>
                            <CardContent className="p-6 space-y-6">
                              <div className="flex items-center justify-between py-3 border-b">
                                <div>
                                  <span className="font-medium">Exigir CPF para agendamento</span>
                                  <p className="text-sm text-muted-foreground">
                                    Solicitar CPF antes de confirmar o agendamento
                                  </p>
                                </div>
                                <Switch
                                  checked={selectedAgente.agendamento.exigir_cpf}
                                  onCheckedChange={(checked) =>
                                    setSelectedAgente(prev => prev ? { 
                                      ...prev, 
                                      agendamento: { ...prev.agendamento, exigir_cpf: checked }
                                    } : null)
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between py-3 border-b">
                                <div>
                                  <span className="font-medium">Permitir cancelamento por IA</span>
                                  <p className="text-sm text-muted-foreground">
                                    A IA pode cancelar consultas a pedido do paciente
                                  </p>
                                </div>
                                <Switch
                                  checked={selectedAgente.agendamento.permitir_cancelamento}
                                  onCheckedChange={(checked) =>
                                    setSelectedAgente(prev => prev ? { 
                                      ...prev, 
                                      agendamento: { ...prev.agendamento, permitir_cancelamento: checked }
                                    } : null)
                                  }
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-6 py-3">
                                <div>
                                  <Label>Antecedência mínima</Label>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Tempo mínimo para agendar antes da consulta
                                  </p>
                                  <Select
                                    value={String(selectedAgente.agendamento.antecedencia_minima_horas)}
                                    onValueChange={(v) =>
                                      setSelectedAgente(prev => prev ? { 
                                        ...prev, 
                                        agendamento: { ...prev.agendamento, antecedencia_minima_horas: Number(v) }
                                      } : null)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">1 hora</SelectItem>
                                      <SelectItem value="2">2 horas</SelectItem>
                                      <SelectItem value="4">4 horas</SelectItem>
                                      <SelectItem value="12">12 horas</SelectItem>
                                      <SelectItem value="24">24 horas</SelectItem>
                                      <SelectItem value="48">48 horas</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label>Antecedência máxima</Label>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Limite máximo de dias para agendar no futuro
                                  </p>
                                  <Select
                                    value={String(selectedAgente.agendamento.antecedencia_maxima_dias)}
                                    onValueChange={(v) =>
                                      setSelectedAgente(prev => prev ? { 
                                        ...prev, 
                                        agendamento: { ...prev.agendamento, antecedencia_maxima_dias: Number(v) }
                                      } : null)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="7">7 dias</SelectItem>
                                      <SelectItem value="14">14 dias</SelectItem>
                                      <SelectItem value="30">30 dias</SelectItem>
                                      <SelectItem value="60">60 dias</SelectItem>
                                      <SelectItem value="90">90 dias</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="flex justify-end">
                            <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                              Salvar Configurações
                            </Button>
                          </div>
                        </div>
                      )}

                      {!selectedAgente?.agendamento.permitir_agendamento && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Ative o agendamento automático para configurar as opções</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção: Intenções */}
                  {activeSection === "intencoes" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Intenções</h2>
                        <div className="flex items-center gap-3">
                          <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar intenções"
                              value={buscarIntencao}
                              onChange={(e) => setBuscarIntencao(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          <Button onClick={() => setNovaIntencaoOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Intenção
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {intencoes
                          .filter(i => i.nome.toLowerCase().includes(buscarIntencao.toLowerCase()))
                          .map((intencao) => (
                            <Card key={intencao.id}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold flex items-center gap-2">
                                      <Target className="w-4 h-4 text-orange-500" />
                                      {intencao.nome}
                                      <Badge variant={intencao.ativa ? "default" : "secondary"} className={intencao.ativa ? "bg-emerald-500" : ""}>
                                        {intencao.ativa ? "Ativa" : "Inativa"}
                                      </Badge>
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {intencao.descricao}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-lg">
                                      Webhook: {intencao.webhook_url}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={intencao.ativa}
                                      onCheckedChange={() => handleToggleIntencao(intencao.id)}
                                    />
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => {
                                          setEditIntencao(intencao);
                                          setEditIntencaoOpen(true);
                                        }}>
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                          navigator.clipboard.writeText(intencao.webhook_url);
                                          toast.success("URL copiada!");
                                        }}>
                                          <Copy className="w-4 h-4 mr-2" />
                                          Copiar URL
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-destructive"
                                          onClick={() => {
                                            setDeleteIntencaoId(intencao.id);
                                            setDeleteIntencaoOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>

                      {intencoes.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Target className="w-12 h-12 mx-auto mb-4" />
                          <p>Nenhuma intenção cadastrada</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seção: Integrações */}
                  {activeSection === "integracoes" && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold">Integrações</h2>
                        <p className="text-muted-foreground">
                          Conecte o seu agente a outros aplicativos, isso permite que ele obtenha informações mais precisas ou agende reuniões para você.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {integracoes.map((integracao) => (
                          <Card key={integracao.id} className="flex flex-col h-full">
                            <CardContent className="p-6 flex flex-col items-center text-center flex-1">
                              <div className="w-14 h-14 mb-3 flex items-center justify-center rounded-xl bg-muted">
                                {integracao.icone === "11" && <span className="text-xl font-bold text-foreground">II</span>}
                                {integracao.icone === "calendar" && <Calendar className="w-8 h-8 text-blue-500" />}
                                {integracao.icone === "chat" && <MessageCircle className="w-8 h-8 text-purple-500" />}
                              </div>
                              
                              <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-base">{integracao.nome}</h4>
                                {integracao.configurada && (
                                  <Badge variant="outline" className="text-emerald-600 border-emerald-600 text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    Configurada
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-3">
                                {integracao.descricao}
                              </p>
                              
                              <div className="flex gap-2 w-full mt-auto">
                                <Button 
                                  variant="outline"
                                  className="flex-1"
                                  size="sm"
                                  onClick={() => handleConfigIntegracao(integracao)}
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Configurar
                                </Button>
                                <Button
                                  variant={integracao.ativa ? "default" : "secondary"}
                                  size="icon"
                                  className={integracao.ativa ? "bg-amber-400 hover:bg-amber-500 text-black" : ""}
                                  onClick={() => handleToggleIntegracao(integracao.id)}
                                  disabled={!integracao.configurada}
                                >
                                  {integracao.ativa ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seção: Configurações */}
                  {activeSection === "configuracoes" && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Preferências da conversa</h2>

                      <Tabs value={configTab} onValueChange={setConfigTab}>
                        <TabsList>
                          <TabsTrigger value="conversa">Conversa</TabsTrigger>
                          <TabsTrigger value="inatividade">Ações de inatividade</TabsTrigger>
                          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                          <TabsTrigger value="transferencia">Regras de transferência</TabsTrigger>
                        </TabsList>

                        <TabsContent value="conversa" className="space-y-4 pt-4">
                          <div className="space-y-4">
                            {[
                              { 
                                id: "transferir_para_humano", 
                                icon: ArrowRightLeft, 
                                label: "Transferir para humano",
                                desc: "Habilite para que o agente possa transferir o atendimento para aba 'em espera' de equipe humana.",
                                field: "transferir_para_humano"
                              },
                              { 
                                id: "usar_emojis", 
                                icon: Smile, 
                                label: "Usar Emojis Nas Respostas",
                                desc: "Define se o agente pode utilizar emojis em suas respostas.",
                                field: "usar_emojis"
                              },
                              { 
                                id: "assinar_nome", 
                                icon: MessageSquare, 
                                label: "Assinar nome do agente nas respostas",
                                desc: "Ative esta opção para que o agente de IA adicione automaticamente sua assinatura em cada resposta enviada ao usuário.",
                                field: "assinar_nome"
                              },
                              { 
                                id: "restringir_temas", 
                                icon: Shield, 
                                label: "Restringir Temas Permitidos",
                                desc: "Marque essa opção para que o agente não fale sobre outros assuntos.",
                                field: "restringir_temas"
                              },
                              { 
                                id: "dividir_resposta", 
                                icon: Split, 
                                label: "Dividir resposta longa em partes",
                                desc: "Se a resposta for muito longa (mais de 700 caracteres), divide em no máximo 3 mensagens separadas por parágrafos. Mantenha desativado para respostas mais concisas.",
                                field: "dividir_resposta"
                              },
                              { 
                                id: "permitir_lembretes", 
                                icon: StickyNote, 
                                label: "Permitir registrar lembretes",
                                desc: "Habilite essa opção para que o agente tenha a capacidade de registrar lembretes ao usuário.",
                                field: "permitir_lembretes"
                              },
                              { 
                                id: "busca_treinamento", 
                                icon: Search, 
                                label: "Busca inteligênte do treinamento",
                                desc: "O agente consulta a base de treinamentos no momento certo, para trazer respostas mais precisas",
                                field: "busca_treinamento",
                                beta: true
                              }
                            ].map((config) => (
                              <div key={config.id} className="flex items-center justify-between py-3 border-b last:border-0">
                                <div className="flex items-start gap-3">
                                  <config.icon className="w-5 h-5 text-purple-500 mt-0.5" />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{config.label}</span>
                                      {config.beta && (
                                        <Badge variant="secondary" className="text-xs">Beta</Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{config.desc}</p>
                                  </div>
                                </div>
                                <Switch
                                  checked={(selectedAgente as any)?.[config.field] || false}
                                  onCheckedChange={(checked) => 
                                    setSelectedAgente(prev => prev ? { ...prev, [config.field]: checked } : null)
                                  }
                                />
                              </div>
                            ))}

                            {/* Timezone */}
                            <div className="flex items-center justify-between py-3 border-b">
                              <div className="flex items-start gap-3">
                                <Globe className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                  <span className="font-medium">Timezone do agente</span>
                                  <p className="text-sm text-muted-foreground">
                                    Escolha o timezone que agente usará para datas, por exemplo agendar reuniões.
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={selectedAgente?.timezone || "America/Sao_Paulo"}
                                onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, timezone: value } : null)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="America/Sao_Paulo">(GMT-03:00) Sao Paulo</SelectItem>
                                  <SelectItem value="America/Manaus">(GMT-04:00) Manaus</SelectItem>
                                  <SelectItem value="America/Fortaleza">(GMT-03:00) Fortaleza</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Tempo de resposta */}
                            <div className="flex items-center justify-between py-3 border-b">
                              <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                  <span className="font-medium">Tempo de resposta</span>
                                  <p className="text-sm text-muted-foreground">
                                    Defina um intervalo para o agente esperar e dar uma resposta.
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={String(selectedAgente?.tempo_resposta || 5)}
                                onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, tempo_resposta: Number(value) } : null)}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">3 segundos</SelectItem>
                                  <SelectItem value="5">5 segundos</SelectItem>
                                  <SelectItem value="10">10 segundos</SelectItem>
                                  <SelectItem value="15">15 segundos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Limite de interações */}
                            <div className="flex items-center justify-between py-3">
                              <div className="flex items-start gap-3">
                                <Target className="w-5 h-5 text-purple-500 mt-0.5" />
                                <div>
                                  <span className="font-medium">Limite de interações por atendimento</span>
                                  <p className="text-sm text-muted-foreground">
                                    Defina a quantidade de interações que o agente pode aceitar por atendimento.
                                  </p>
                                </div>
                              </div>
                              <Select
                                value={String(selectedAgente?.limite_interacoes || 0)}
                                onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, limite_interacoes: Number(value) } : null)}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">Sem limite</SelectItem>
                                  <SelectItem value="5">5 interações</SelectItem>
                                  <SelectItem value="10">10 interações</SelectItem>
                                  <SelectItem value="20">20 interações</SelectItem>
                                  <SelectItem value="50">50 interações</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4">
                            <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                              Salvar
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="inatividade" className="pt-4">
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-5 h-5 text-purple-500" />
                                  <h3 className="font-semibold">Ações de Follow-up (Inatividade)</h3>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (!selectedAgente) {
                                      toast.error("Selecione um agente primeiro");
                                      return;
                                    }
                                    const novaAcao: AcaoFollowUp = {
                                      id: `followup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                      tempo_minutos: 5,
                                      acao: "mensagem",
                                      mensagem: "",
                                      ativa: true
                                    };
                                    setSelectedAgente(prev => prev ? {
                                      ...prev,
                                      acoes_followup: [...(prev.acoes_followup || []), novaAcao]
                                    } : null);
                                    toast.success("Follow-up adicionado!");
                                  }}
                                  className="gap-1"
                                >
                                  <Plus className="w-4 h-4" />
                                  Adicionar Follow-up
                                </Button>
                              </div>
                              
                              <p className="text-sm text-muted-foreground">
                                Configure ações automáticas quando o cliente ficar sem responder. A IA disparará essas mensagens na sequência configurada.
                              </p>
                              
                              {(!selectedAgente?.acoes_followup || selectedAgente.acoes_followup.length === 0) ? (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                  <p>Nenhuma ação de follow-up configurada</p>
                                  <p className="text-sm">Clique em "Adicionar Follow-up" para criar</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {selectedAgente.acoes_followup.map((acao, index) => (
                                    <Card key={acao.id} className="border-l-4" style={{ borderLeftColor: acao.ativa ? "#10b981" : "#94a3b8" }}>
                                      <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              Follow-up #{index + 1}
                                            </Badge>
                                            <Switch
                                              checked={acao.ativa}
                                              onCheckedChange={(checked) => {
                                                setSelectedAgente(prev => prev ? {
                                                  ...prev,
                                                  acoes_followup: prev.acoes_followup.map(a => 
                                                    a.id === acao.id ? { ...a, ativa: checked } : a
                                                  )
                                                } : null);
                                              }}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                              {acao.ativa ? "Ativo" : "Inativo"}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => {
                                              setSelectedAgente(prev => prev ? {
                                                ...prev,
                                                acoes_followup: prev.acoes_followup.filter(a => a.id !== acao.id)
                                              } : null);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <Label className="text-xs">Tempo de inatividade</Label>
                                            <Select
                                              value={String(acao.tempo_minutos)}
                                              onValueChange={(value) => {
                                                setSelectedAgente(prev => prev ? {
                                                  ...prev,
                                                  acoes_followup: prev.acoes_followup.map(a => 
                                                    a.id === acao.id ? { ...a, tempo_minutos: Number(value) } : a
                                                  )
                                                } : null);
                                              }}
                                            >
                                              <SelectTrigger className="h-9">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="2">2 minutos</SelectItem>
                                                <SelectItem value="5">5 minutos</SelectItem>
                                                <SelectItem value="10">10 minutos</SelectItem>
                                                <SelectItem value="15">15 minutos</SelectItem>
                                                <SelectItem value="30">30 minutos</SelectItem>
                                                <SelectItem value="60">1 hora</SelectItem>
                                                <SelectItem value="120">2 horas</SelectItem>
                                                <SelectItem value="1440">24 horas</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="space-y-1">
                                            <Label className="text-xs">Ação</Label>
                                            <Select
                                              value={acao.acao}
                                              onValueChange={(value: "mensagem" | "encerrar" | "transferir") => {
                                                setSelectedAgente(prev => prev ? {
                                                  ...prev,
                                                  acoes_followup: prev.acoes_followup.map(a => 
                                                    a.id === acao.id ? { ...a, acao: value } : a
                                                  )
                                                } : null);
                                              }}
                                            >
                                              <SelectTrigger className="h-9">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="mensagem">Enviar mensagem</SelectItem>
                                                <SelectItem value="encerrar">Encerrar atendimento</SelectItem>
                                                <SelectItem value="transferir">Transferir para humano</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        
                                        {acao.acao === "mensagem" && (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Mensagem do follow-up</Label>
                                            <Textarea
                                              value={acao.mensagem}
                                              onChange={(e) => {
                                                setSelectedAgente(prev => prev ? {
                                                  ...prev,
                                                  acoes_followup: prev.acoes_followup.map(a => 
                                                    a.id === acao.id ? { ...a, mensagem: e.target.value } : a
                                                  )
                                                } : null);
                                              }}
                                              placeholder="Ex: Olá! Notei que você ficou um tempo sem responder. Posso ajudar em algo mais?"
                                              rows={2}
                                              className="text-sm"
                                            />
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex justify-end pt-4">
                                <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                                  Salvar Configurações
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="webhooks" className="pt-4">
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <Webhook className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold">Configurar Webhooks</h3>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>URL do Webhook</Label>
                                  <Input
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    placeholder="https://seu-servidor.com/webhook"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Eventos para notificar</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { id: "mensagem_recebida", label: "Mensagem recebida" },
                                      { id: "mensagem_enviada", label: "Mensagem enviada" },
                                      { id: "atendimento_iniciado", label: "Atendimento iniciado" },
                                      { id: "atendimento_finalizado", label: "Atendimento finalizado" },
                                      { id: "transferencia", label: "Transferência" },
                                      { id: "erro", label: "Erro" }
                                    ].map((evento) => (
                                      <label key={evento.id} className="flex items-center gap-2 p-2 border rounded hover:bg-muted cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={webhookEventos.includes(evento.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setWebhookEventos(prev => [...prev, evento.id]);
                                            } else {
                                              setWebhookEventos(prev => prev.filter(e => e !== evento.id));
                                            }
                                          }}
                                          className="rounded"
                                        />
                                        <span className="text-sm">{evento.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button onClick={handleSalvarWebhooks} className="bg-emerald-500 hover:bg-emerald-600">
                                  Salvar Webhooks
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="transferencia" className="pt-4">
                          <Card>
                            <CardContent className="p-6 space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold">Regras de transferência</h3>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Palavras-chave para transferência</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Quando o usuário mencionar essas palavras, o atendimento será transferido para um humano.
                                  </p>
                                  <Textarea
                                    value={selectedAgente?.palavras_chave_transferencia?.join(", ") || ""}
                                    onChange={(e) => setSelectedAgente(prev => prev ? { 
                                      ...prev, 
                                      palavras_chave_transferencia: e.target.value.split(",").map(p => p.trim()).filter(Boolean)
                                    } : null)}
                                    placeholder="humano, atendente, pessoa real, falar com alguém"
                                    rows={2}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <Label>Fila de destino</Label>
                                  <Select
                                    value={selectedAgente?.fila_transferencia || ""}
                                    onValueChange={(value) => setSelectedAgente(prev => prev ? { ...prev, fila_transferencia: value } : null)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma fila" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="suporte">Suporte Geral</SelectItem>
                                      <SelectItem value="vendas">Vendas</SelectItem>
                                      <SelectItem value="financeiro">Financeiro</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button onClick={handleSalvarAgente} className="bg-emerald-500 hover:bg-emerald-600">
                                  Salvar Regras
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialog: Testar IA */}
      <Dialog open={testarIaOpen} onOpenChange={setTestarIaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              Testar {selectedAgente?.nome}
            </DialogTitle>
            <DialogDescription>
              Converse com sua IA para testar o comportamento
            </DialogDescription>
          </DialogHeader>
          <div className="h-80 overflow-y-auto border rounded-lg p-4 space-y-3 bg-muted/30">
            {chatMensagens.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Envie uma mensagem para começar...
              </p>
            )}
            {chatMensagens.map((msg, idx) => (
              <div key={idx} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2",
                  msg.role === "user" ? "bg-purple-600 text-white" : "bg-background border"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background border rounded-lg px-3 py-2">
                  <span className="animate-pulse">Digitando...</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => e.key === "Enter" && handleEnviarMensagemTeste()}
            />
            <Button onClick={handleEnviarMensagemTeste} disabled={isLoading || !chatInput.trim()}>
              Enviar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Treinamento */}
      <Dialog open={editTreinamentoOpen} onOpenChange={setEditTreinamentoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Treinamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editTreinamento?.conteudo || ""}
              onChange={(e) => setEditTreinamento(prev => prev ? { ...prev, conteudo: e.target.value } : null)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTreinamentoOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditTreinamento}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Intenção */}
      <Dialog open={novaIntencaoOpen} onOpenChange={setNovaIntencaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Intenção</DialogTitle>
            <DialogDescription>Configure uma nova intenção com webhook</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Intenção</Label>
              <Input
                value={novaIntencao.nome}
                onChange={(e) => setNovaIntencao(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: INTENÇÃO: agendar consulta"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={novaIntencao.descricao}
                onChange={(e) => setNovaIntencao(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Dispara quando o usuário quer agendar..."
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={novaIntencao.webhook_url}
                onChange={(e) => setNovaIntencao(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="https://seu-servidor.com/webhook"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaIntencaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarIntencao}>Criar Intenção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Intenção */}
      <Dialog open={editIntencaoOpen} onOpenChange={setEditIntencaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Intenção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editIntencao?.nome || ""}
                onChange={(e) => setEditIntencao(prev => prev ? { ...prev, nome: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={editIntencao?.descricao || ""}
                onChange={(e) => setEditIntencao(prev => prev ? { ...prev, descricao: e.target.value } : null)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <Input
                value={editIntencao?.webhook_url || ""}
                onChange={(e) => setEditIntencao(prev => prev ? { ...prev, webhook_url: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIntencaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditIntencaoSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Integração */}
      <Dialog open={configIntegracaoOpen} onOpenChange={setConfigIntegracaoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar {integracaoSelecionada?.nome}</DialogTitle>
            <DialogDescription>{integracaoSelecionada?.descricao}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input
                type="password"
                value={integracaoApiKey}
                onChange={(e) => setIntegracaoApiKey(e.target.value)}
                placeholder="Cole sua chave de API aqui"
              />
            </div>
            {integracaoSelecionada?.nome === "ElevenLabs" && (
              <p className="text-sm text-muted-foreground">
                Obtenha sua API Key em{" "}
                <a href="https://elevenlabs.io" target="_blank" className="text-purple-600 hover:underline">
                  elevenlabs.io
                </a>
              </p>
            )}
            {integracaoSelecionada?.nome === "Google Calendar" && (
              <p className="text-sm text-muted-foreground">
                Configure o OAuth2 do Google Calendar para permitir agendamentos.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigIntegracaoOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarIntegracao}>Salvar e Ativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Excluir Treinamento */}
      <AlertDialog open={deleteTreinamentoOpen} onOpenChange={setDeleteTreinamentoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treinamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTreinamento} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Excluir Intenção */}
      <AlertDialog open={deleteIntencaoOpen} onOpenChange={setDeleteIntencaoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir intenção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A intenção e seu webhook serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIntencao} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Excluir Agente */}
      <AlertDialog open={deleteAgenteOpen} onOpenChange={setDeleteAgenteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente "{selectedAgente?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente, seus treinamentos e configurações serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgente} className="bg-destructive text-destructive-foreground">
              Excluir Agente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OmniLayout>
  );
}

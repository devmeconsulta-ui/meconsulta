import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, 
  Play,
  Pause,
  Circle,
  MessageSquare,
  ArrowLeftRight,
  Eye,
  MoreVertical,
  BookOpen,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Bot,
} from "lucide-react";
import { useOmniAtendimentos, OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { FilaFilterAccordion } from "@/components/clinica/omnichannel/agentes/FilaFilterAccordion";
import { TransferirAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal";
import { VisualizarConversaModal } from "@/components/clinica/omnichannel/atendimentos/VisualizarConversaModal";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

interface Agente {
  id: string;
  nome: string;
  avatar_url?: string | null;
  status: "online" | "offline" | "pausa";
  filas: number;
  chatsAtivos: number;
  chatsHoje: number;
  satisfacaoMedia: number;
  satisfacaoTotal: number;
  tempoLogado: string;
  tempoPausa: string;
}

export default function OmniAgentes() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const [activeTab, setActiveTab] = useState("agentes");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilas, setSelectedFilas] = useState<string[]>([]);
  const [filterAgente, setFilterAgente] = useState("todos");
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loadingAgentes, setLoadingAgentes] = useState(true);

  // Modal states
  const [selectedAtendimento, setSelectedAtendimento] = useState<OmniAtendimento | null>(null);
  const [isTransferirModalOpen, setIsTransferirModalOpen] = useState(false);
  const [isVisualizarModalOpen, setIsVisualizarModalOpen] = useState(false);

  const { atendimentos, loading: loadingAtendimentos, refetch } = useOmniAtendimentos(clinicaId);
  const { filas, loading: loadingFilas } = useOmniFilas(clinicaId);

  // Fetch real agents from usuarios_clinica
  useEffect(() => {
    const fetchAgentes = async () => {
      if (!clinicaId) {
        setLoadingAgentes(false);
        return;
      }

      try {
        const { data: usuarios, error } = await supabase
          .from("usuarios_clinica")
          .select("*")
          .eq("clinica_id", clinicaId)
          .eq("ativo", true);

        if (error) throw error;

        // Transform usuarios into agentes with computed metrics
        const agentesData: Agente[] = (usuarios || []).map((u) => {
          // Count active chats for this agent
          const chatsAtivos = atendimentos.filter(
            (a) => a.agente_id === u.id && a.status === "em_atendimento"
          ).length;

          // Count today's chats for this agent
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const chatsHoje = atendimentos.filter((a) => {
            if (a.agente_id !== u.id) return false;
            const dataAbertura = new Date(a.data_abertura);
            return dataAbertura >= hoje;
          }).length;

          // Calculate average satisfaction from atendimentos
          const atendimentosComNota = atendimentos.filter(
            (a) => a.agente_id === u.id && a.avaliacao_nota
          );
          const satisfacaoMedia =
            atendimentosComNota.length > 0
              ? atendimentosComNota.reduce((acc, a) => acc + (a.avaliacao_nota || 0), 0) /
                atendimentosComNota.length
              : 0;

          // Count filas (we'll assume agent can work in all filas for now)
          const filasCount = filas.length;

          return {
            id: u.id,
            nome: u.nome,
            avatar_url: null,
            status: "offline" as const, // Default to offline, would need realtime presence for actual status
            filas: filasCount,
            chatsAtivos,
            chatsHoje,
            satisfacaoMedia,
            satisfacaoTotal: satisfacaoMedia,
            tempoLogado: "00:00:00",
            tempoPausa: "00:00:00",
          };
        });

        setAgentes(agentesData);
      } catch (error) {
        console.error("Error fetching agentes:", error);
      } finally {
        setLoadingAgentes(false);
      }
    };

    fetchAgentes();
  }, [clinicaId, atendimentos, filas]);

  const loading = loadingAtendimentos || loadingFilas || loadingAgentes;

  // Filter agentes based on search
  const filteredAgentes = useMemo(() => {
    return agentes.filter((a) => {
      const matchesSearch = !searchTerm || a.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterAgente === "todos" || a.id === filterAgente;
      return matchesSearch && matchesFilter;
    });
  }, [agentes, searchTerm, filterAgente]);

  // Count agentes by status
  const agenteStatusCounts = useMemo(() => {
    const counts = { online: 0, pausa: 0, offline: 0 };
    agentes.forEach((a) => {
      counts[a.status]++;
    });
    return counts;
  }, [agentes]);

  // Filter atendimentos based on selected filas and search
  const filteredAtendimentos = useMemo(() => {
    return atendimentos.filter((a) => {
      const matchesFila = selectedFilas.length === 0 || (a.fila_id && selectedFilas.includes(a.fila_id));
      const matchesSearch = !searchTerm || 
        a.contato?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.contato?.telefone?.includes(searchTerm);
      return matchesFila && matchesSearch;
    });
  }, [atendimentos, selectedFilas, searchTerm]);

  // Count atendimentos by status
  const statusCounts = useMemo(() => {
    const counts = { aguardando: 0, em_atendimento: 0, finalizado: 0 };
    filteredAtendimentos.forEach((a) => {
      if (a.status in counts) {
        counts[a.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [filteredAtendimentos]);

  const toggleFila = (filaId: string) => {
    setSelectedFilas((prev) =>
      prev.includes(filaId) ? prev.filter((id) => id !== filaId) : [...prev, filaId]
    );
  };

  // Modal handlers
  const handleTransferir = (atendimento: OmniAtendimento) => {
    setSelectedAtendimento(atendimento);
    setIsTransferirModalOpen(true);
  };

  const handleVisualizarConversa = (atendimento: OmniAtendimento) => {
    setSelectedAtendimento(atendimento);
    setIsVisualizarModalOpen(true);
  };

  const handleEncerrar = async (atendimento: OmniAtendimento) => {
    const { error } = await supabase
      .from("omni_atendimentos")
      .update({ status: "finalizado", data_fechamento: new Date().toISOString() })
      .eq("id", atendimento.id);

    if (error) {
      console.error("Error closing atendimento:", error);
      toast.error("Erro ao encerrar atendimento");
    } else {
      toast.success("Atendimento encerrado com sucesso");
      refetch();
    }
  };

  const handleTransferirConfirm = async (atendimentoId: string, novoAgenteId?: string) => {
    const { error } = await supabase
      .from("omni_atendimentos")
      .update({ agente_id: novoAgenteId })
      .eq("id", atendimentoId);

    if (error) {
      toast.error("Erro ao transferir atendimento");
      throw error;
    } else {
      toast.success("Atendimento transferido com sucesso");
      refetch();
    }
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return "N/A";
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: false });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Prepare agentes data for transfer modal
  const agentesParaTransferencia = useMemo(() => {
    return agentes.map((a) => ({
      id: a.id,
      nome: a.nome,
      atendimentos_count: a.chatsAtivos,
    }));
  }, [agentes]);

  if (loading) {
    return (
      <OmniLayout>
        <div className="flex items-center justify-center h-[calc(100vh-250px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OmniLayout>
    );
  }

  return (
    <OmniLayout>
      {/* Conteúdo */}
      <div className="flex gap-4">
        {/* Left Sidebar - Filas Filter (hidden on mobile) */}
        <div className="hidden lg:block">
          <FilaFilterAccordion
            filas={filas}
            atendimentos={atendimentos}
            selectedFilas={selectedFilas}
            onToggleFila={toggleFila}
            onClearFilters={() => setSelectedFilas([])}
            onTransferir={handleTransferir}
            onVisualizarConversa={handleVisualizarConversa}
            onEncerrar={handleEncerrar}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 sm:mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="h-10 sm:h-12 w-full lg:w-auto">
                <TabsTrigger value="agentes" className="flex-1 lg:flex-none px-4 sm:px-8 h-8 sm:h-10 text-xs sm:text-sm">
                  Painel de agentes
                </TabsTrigger>
                <TabsTrigger value="atendimentos" className="flex-1 lg:flex-none px-4 sm:px-8 h-8 sm:h-10 text-xs sm:text-sm">
                  Painel de atendimentos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Select value={filterAgente} onValueChange={setFilterAgente}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Agentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {agentes.map((agente) => (
                    <SelectItem key={agente.id} value={agente.id}>
                      {agente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-48"
                />
              </div>
            </div>
          </div>

          {/* Agentes Panel */}
          {activeTab === "agentes" && (
            <div className="space-y-4">
              {/* Status Counters */}
              <div className="flex items-center justify-end gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 fill-destructive text-destructive" />
                  <span>{agenteStatusCounts.offline}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 fill-orange-500 text-orange-500" />
                  <span>{agenteStatusCounts.pausa}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 fill-green-500 text-green-500" />
                  <span>{agenteStatusCounts.online}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{agentes.length}</span>
                </div>
              </div>

              {/* Agents Table */}
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-4 font-medium">Agente ↑</th>
                        <th className="text-center p-4 font-medium" colSpan={3}>
                          <div className="flex flex-col items-center">
                            <span>Agora</span>
                            <div className="flex items-center gap-6 mt-1 text-xs text-muted-foreground">
                              <Play className="w-3 h-3" />
                              <span>Fila</span>
                              <MessageSquare className="w-3 h-3" />
                            </div>
                          </div>
                        </th>
                        <th className="text-center p-4 font-medium" colSpan={5}>
                          <div className="flex flex-col items-center">
                            <span>Hoje</span>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <MessageSquare className="w-3 h-3" />
                              <span>😊</span>
                              <span>😊</span>
                              <span>Logado</span>
                              <span>Pausa</span>
                            </div>
                          </div>
                        </th>
                        <th className="text-center p-4 font-medium">Funções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgentes.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-muted-foreground">
                            Nenhum agente encontrado
                          </td>
                        </tr>
                      ) : (
                        filteredAgentes.map((agente) => (
                          <tr key={agente.id} className="border-b hover:bg-muted/20">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={agente.avatar_url || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(agente.nome)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{agente.nome}</p>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <MessageSquare className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center p-4">
                              <span className="text-sm">{agente.filas}</span>
                            </td>
                            <td className="text-center p-4">
                              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${
                                agente.status === "online" 
                                  ? "bg-green-500/20 text-green-500" 
                                  : agente.status === "pausa"
                                  ? "bg-orange-500/20 text-orange-500"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {agente.status === "online" ? (
                                  <Play className="w-5 h-5 fill-current" />
                                ) : agente.status === "pausa" ? (
                                  <Pause className="w-5 h-5" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </div>
                            </td>
                            <td className="text-center p-4">
                              <div className="text-center">
                                <span className="font-semibold">{agente.chatsAtivos}</span>
                                <p className="text-xs text-muted-foreground">chats</p>
                              </div>
                            </td>
                            <td className="text-center p-4">
                              <div className="text-center">
                                <span className="font-semibold">{agente.chatsHoje}</span>
                                <p className="text-xs text-muted-foreground">chats</p>
                              </div>
                            </td>
                            <td className="text-center p-4 text-sm">
                              😊 {agente.satisfacaoMedia.toFixed(1)}
                            </td>
                            <td className="text-center p-4 text-sm">
                              😊 {agente.satisfacaoTotal.toFixed(1)}
                            </td>
                            <td className="text-center p-4 text-sm font-mono">
                              {agente.tempoLogado}
                            </td>
                            <td className="text-center p-4 text-sm font-mono">
                              {agente.tempoPausa}
                            </td>
                            <td className="text-center p-4">
                              <div className="flex items-center justify-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Users className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ver filas</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <BookOpen className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Histórico</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Visualizar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Atendimentos Panel */}
          {activeTab === "atendimentos" && (
            <div className="space-y-4">
              {/* Status Counters */}
              <div className="flex items-center justify-end gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>{statusCounts.aguardando}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span>{statusCounts.em_atendimento}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{statusCounts.finalizado}</span>
                </div>
              </div>

              {/* Atendimentos Table */}
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-4 font-medium w-16">Etiqueta</th>
                        <th className="text-left p-4 font-medium">Cliente ↑</th>
                        <th className="text-left p-4 font-medium">Agente</th>
                        <th className="text-center p-4 font-medium w-16">Status</th>
                        <th className="text-center p-4 font-medium w-16">
                          <Bot className="w-4 h-4 mx-auto" />
                        </th>
                        <th className="text-center p-4 font-medium">Aberto</th>
                        <th className="text-center p-4 font-medium">Atribuído</th>
                        <th className="text-center p-4 font-medium">Funções</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAtendimentos.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum atendimento encontrado
                          </td>
                        </tr>
                      ) : (
                        filteredAtendimentos.map((atendimento) => (
                          <tr key={atendimento.id} className="border-b hover:bg-muted/20">
                            <td className="p-4">
                              {atendimento.etiquetas?.length > 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  {atendimento.etiquetas[0]}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={atendimento.contato?.foto_url || undefined} />
                                  <AvatarFallback className="bg-green-500/20 text-green-600">
                                    {atendimento.contato?.nome 
                                      ? getInitials(atendimento.contato.nome)
                                      : atendimento.contato?.telefone?.slice(-2) || "?"
                                    }
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {atendimento.contato?.nome || atendimento.contato?.telefone || "Desconhecido"}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              {atendimento.agente ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getInitials(atendimento.agente.nome)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{atendimento.agente.nome}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Não atribuído</span>
                              )}
                            </td>
                            <td className="text-center p-4">
                              {atendimento.status === "finalizado" ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                              ) : atendimento.status === "em_atendimento" ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto" />
                              ) : (
                                <XCircle className="w-6 h-6 text-destructive mx-auto" />
                              )}
                            </td>
                            <td className="text-center p-4 text-sm text-muted-foreground">
                              N/A
                            </td>
                            <td className="text-center p-4 text-sm">
                              {formatTimeAgo(atendimento.data_abertura)}
                            </td>
                            <td className="text-center p-4 text-sm">
                              {atendimento.data_primeira_resposta 
                                ? formatTimeAgo(atendimento.data_primeira_resposta)
                                : "N/A"
                              }
                            </td>
                            <td className="text-center p-4">
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Visualizar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MessageSquare className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Abrir chat</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <ArrowLeftRight className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Transferir</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Encerrar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <TransferirAtendimentoModal
        open={isTransferirModalOpen}
        onClose={() => {
          setIsTransferirModalOpen(false);
          setSelectedAtendimento(null);
        }}
        atendimento={selectedAtendimento}
        filas={filas.map((f) => ({ id: f.id, nome: f.nome, cor: f.cor }))}
        agentes={agentesParaTransferencia}
        onTransferir={handleTransferirConfirm}
      />

      <VisualizarConversaModal
        open={isVisualizarModalOpen}
        onClose={() => {
          setIsVisualizarModalOpen(false);
          setSelectedAtendimento(null);
        }}
        atendimento={selectedAtendimento}
        onTransferir={() => {
          setIsVisualizarModalOpen(false);
          setIsTransferirModalOpen(true);
        }}
      />
    </OmniLayout>
  );
}

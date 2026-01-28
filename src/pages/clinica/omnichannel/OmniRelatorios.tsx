import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  MessageSquare,
  Users,
  Clock,
  Pause,
  Filter,
  RefreshCw,
  Loader2,
  CalendarClock,
  Target,
  ChevronDown
} from "lucide-react";
import { format, subDays, isWithinInterval, startOfMonth, endOfMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniHeader } from "@/components/clinica/omnichannel/OmniHeader";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

type ReportType = "chats" | "reaberturas" | "oportunidades" | "agentes" | "filas" | "pausas";

export default function OmniRelatorios() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const [activeReport, setActiveReport] = useState<ReportType>("chats");
  const [periodo, setPeriodo] = useState("30dias");
  const [searchTerm, setSearchTerm] = useState("");
  const [filaFilter, setFilaFilter] = useState("todas");
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const { atendimentos, mensagens, loading: loadingAtendimentos, refetch } = useOmniAtendimentos(clinicaId);
  const { filas, loading: loadingFilas } = useOmniFilas(clinicaId);

  // Buscar agentes
  const { data: agentes = [] } = useQuery({
    queryKey: ["omni-agentes-relatorio", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      // @ts-ignore - Supabase type instantiation issue
      const result = await supabase
        .from("omni_agentes")
        .select("*, usuario:usuarios_clinica(id, nome)")
        .eq("clinica_id", clinicaId);
      return (result.data as any[]) || [];
    },
    enabled: !!clinicaId
  });

  // Buscar pausas
  const { data: pausas = [] } = useQuery({
    queryKey: ["omni-pausas-relatorio", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      // @ts-ignore - Supabase type instantiation issue
      const result = await supabase
        .from("omni_agente_pausas")
        .select("*, agente:omni_agentes(id, usuario:usuarios_clinica(nome)), tipo:omni_pausas_tipos(nome)")
        .eq("clinica_id", clinicaId)
        .order("inicio", { ascending: false });
      return (result.data as any[]) || [];
    },
    enabled: !!clinicaId
  });

  const loading = loadingAtendimentos || loadingFilas;

  // Filtrar por período
  const filterByPeriod = (date: Date) => {
    const now = new Date();
    switch (periodo) {
      case "hoje":
        return isToday(date);
      case "ontem":
        return format(date, "yyyy-MM-dd") === format(subDays(now, 1), "yyyy-MM-dd");
      case "7dias":
        return isWithinInterval(date, { start: subDays(now, 7), end: now });
      case "30dias":
        return isWithinInterval(date, { start: subDays(now, 30), end: now });
      case "mes":
        return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
      default:
        return true;
    }
  };

  // Dados filtrados por período
  const filteredAtendimentos = useMemo(() => {
    return atendimentos.filter(a => {
      const date = new Date(a.data_abertura);
      const matchPeriod = filterByPeriod(date);
      const matchFila = filaFilter === "todas" || a.fila_id === filaFilter;
      const matchAgente = agenteFilter === "todos" || a.agente_id === agenteFilter;
      const matchStatus = statusFilter === "todos" || a.status === statusFilter;
      const matchSearch = !searchTerm || 
        a.contato?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.contato?.telefone?.includes(searchTerm);
      return matchPeriod && matchFila && matchAgente && matchStatus && matchSearch;
    });
  }, [atendimentos, periodo, filaFilter, agenteFilter, statusFilter, searchTerm]);

  const filteredPausas = useMemo(() => {
    return pausas.filter(p => {
      const date = new Date(p.inicio);
      const matchPeriod = filterByPeriod(date);
      const matchAgente = agenteFilter === "todos" || p.agente_id === agenteFilter;
      return matchPeriod && matchAgente;
    });
  }, [pausas, periodo, agenteFilter]);

  // Estatísticas por fila
  const filasStats = useMemo(() => {
    return filas.map(fila => {
      const filaAtendimentos = filteredAtendimentos.filter(a => a.fila_id === fila.id);
      const totalMensagens = mensagens.filter(m => 
        filaAtendimentos.some(a => a.id === m.atendimento_id)
      ).length;
      
      return {
        id: fila.id,
        nome: fila.nome,
        atendimentos: filaAtendimentos.length,
        emAtendimento: filaAtendimentos.filter(a => a.status === "em_atendimento").length,
        finalizados: filaAtendimentos.filter(a => a.status === "finalizado").length,
        mensagens: totalMensagens
      };
    });
  }, [filas, filteredAtendimentos, mensagens]);

  // Estatísticas por agente
  const agentesStats = useMemo(() => {
    return agentes.map(agente => {
      const agenteAtendimentos = filteredAtendimentos.filter(a => a.agente_id === agente.id);
      const agentePausas = filteredPausas.filter(p => p.agente_id === agente.id);
      const tempoPausas = agentePausas.reduce((acc, p) => {
        if (p.fim) {
          return acc + (new Date(p.fim).getTime() - new Date(p.inicio).getTime());
        }
        return acc;
      }, 0);

      return {
        id: agente.id,
        nome: agente.usuario?.nome || "Sem nome",
        status: agente.status,
        atendimentos: agenteAtendimentos.length,
        finalizados: agenteAtendimentos.filter(a => a.status === "finalizado").length,
        emAtendimento: agenteAtendimentos.filter(a => a.status === "em_atendimento").length,
        pausas: agentePausas.length,
        tempoPausas: Math.round(tempoPausas / 60000) // minutos
      };
    });
  }, [agentes, filteredAtendimentos, filteredPausas]);

  const handleExport = () => {
    // TODO: Implementar exportação
    console.log("Exportar relatório:", activeReport);
  };

  const reportTypes = [
    { id: "chats", label: "Histórico de Chats", icon: MessageSquare },
    { id: "reaberturas", label: "Reaberturas Agendadas", icon: CalendarClock },
    { id: "oportunidades", label: "Histórico de Oportunidades", icon: Target },
    { id: "agentes", label: "Agentes", icon: Users },
    { id: "filas", label: "Filas", icon: Filter },
    { id: "pausas", label: "Relatório de Pausas", icon: Pause },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      aguardando: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
      em_atendimento: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400",
      finalizado: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
      abandonado: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400",
    };
    const labels: Record<string, string> = {
      aguardando: "Aguardando",
      em_atendimento: "Em atendimento",
      finalizado: "Finalizado",
      abandonado: "Abandonado",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="-m-4 sm:-m-6 -mt-16 lg:-mt-6">
        <div className="fixed top-16 left-0 lg:left-64 right-0 z-30 bg-background border-b border-border">
          <OmniHeader />
        </div>
        <div className="h-14" />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 sm:-m-6 -mt-16 lg:-mt-6">
      {/* Header fixo */}
      <div className="fixed top-16 left-0 lg:left-64 right-0 z-30 bg-background border-b border-border">
        <OmniHeader />
      </div>

      <div className="h-14" />

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Header da página */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">
              Análise detalhada do atendimento omnichannel
            </p>
          </div>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>

        {/* Seletor de tipo de relatório */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {reportTypes.map((report) => (
                <Button
                  key={report.id}
                  variant={activeReport === report.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveReport(report.id as ReportType)}
                  className="gap-2"
                >
                  <report.icon className="w-4 h-4" />
                  {report.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filtros colapsáveis */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </CardTitle>
                  <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger>
                      <Calendar className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="ontem">Ontem</SelectItem>
                      <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                      <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                      <SelectItem value="mes">Este mês</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filaFilter} onValueChange={setFilaFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fila" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as filas</SelectItem>
                      {filas.map((fila) => (
                        <SelectItem key={fila.id} value={fila.id}>{fila.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={agenteFilter} onValueChange={setAgenteFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Agente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os agentes</SelectItem>
                      {agentes.map((agente) => (
                        <SelectItem key={agente.id} value={agente.id}>
                          {agente.usuario?.nome || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="abandonado">Abandonado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Conteúdo do relatório */}
        <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {reportTypes.find(r => r.id === activeReport)?.label}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {/* Histórico de Chats */}
            {activeReport === "chats" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Fila</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Msgs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAtendimentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum atendimento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAtendimentos.map((atendimento) => {
                        const msgCount = mensagens.filter(m => m.atendimento_id === atendimento.id).length;
                        const fila = filas.find(f => f.id === atendimento.fila_id);
                        const agente = agentes.find(a => a.id === atendimento.agente_id);
                        return (
                          <TableRow key={atendimento.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(atendimento.data_abertura), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium">{atendimento.contato?.nome || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">{atendimento.contato?.telefone || "-"}</TableCell>
                            <TableCell>{fila?.nome || "-"}</TableCell>
                            <TableCell>{agente?.usuario?.nome || "-"}</TableCell>
                            <TableCell>{getStatusBadge(atendimento.status)}</TableCell>
                            <TableCell className="text-center font-mono">{msgCount}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Reaberturas Agendadas */}
            {activeReport === "reaberturas" && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarClock className="w-12 h-12 mb-4 opacity-30" />
                <p>Nenhuma reabertura agendada</p>
                <p className="text-sm">Atendimentos com retorno programado aparecerão aqui</p>
              </div>
            )}

            {/* Histórico de Oportunidades */}
            {activeReport === "oportunidades" && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Target className="w-12 h-12 mb-4 opacity-30" />
                <p>Nenhuma oportunidade registrada</p>
                <p className="text-sm">Leads convertidos do omnichannel aparecerão aqui</p>
              </div>
            )}

            {/* Relatório de Agentes */}
            {activeReport === "agentes" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Agente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Atendimentos</TableHead>
                      <TableHead className="text-center">Em Atendimento</TableHead>
                      <TableHead className="text-center">Finalizados</TableHead>
                      <TableHead className="text-center">Pausas</TableHead>
                      <TableHead className="text-center">Tempo em Pausa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentesStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum agente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      agentesStats.map((agente) => (
                        <TableRow key={agente.id}>
                          <TableCell className="font-medium">{agente.nome}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={
                                agente.status === "online" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50" 
                                  : agente.status === "pausado"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50"
                                  : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/50"
                              }
                            >
                              {agente.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">{agente.atendimentos}</TableCell>
                          <TableCell className="text-center font-mono">{agente.emAtendimento}</TableCell>
                          <TableCell className="text-center font-mono">{agente.finalizados}</TableCell>
                          <TableCell className="text-center font-mono">{agente.pausas}</TableCell>
                          <TableCell className="text-center font-mono">{agente.tempoPausas}min</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Relatório de Filas */}
            {activeReport === "filas" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Fila</TableHead>
                      <TableHead className="text-center">Total Atendimentos</TableHead>
                      <TableHead className="text-center">Em Atendimento</TableHead>
                      <TableHead className="text-center">Finalizados</TableHead>
                      <TableHead className="text-center">Mensagens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhuma fila encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filasStats.map((fila) => (
                        <TableRow key={fila.id}>
                          <TableCell className="font-medium">{fila.nome}</TableCell>
                          <TableCell className="text-center font-mono">{fila.atendimentos}</TableCell>
                          <TableCell className="text-center font-mono">{fila.emAtendimento}</TableCell>
                          <TableCell className="text-center font-mono">{fila.finalizados}</TableCell>
                          <TableCell className="text-center font-mono">{fila.mensagens}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Relatório de Pausas */}
            {activeReport === "pausas" && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Data/Hora Início</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Tipo de Pausa</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPausas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhuma pausa registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPausas.map((pausa: any) => {
                        const duracao = pausa.fim 
                          ? Math.round((new Date(pausa.fim).getTime() - new Date(pausa.inicio).getTime()) / 60000)
                          : null;
                        return (
                          <TableRow key={pausa.id}>
                            <TableCell className="font-mono text-sm">
                              {format(new Date(pausa.inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-medium">{pausa.agente?.usuario?.nome || "-"}</TableCell>
                            <TableCell>{pausa.tipo?.nome || "-"}</TableCell>
                            <TableCell className="font-mono">
                              {duracao !== null ? `${duracao}min` : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                pausa.fim 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50"
                              }>
                                {pausa.fim ? "Finalizada" : "Em andamento"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

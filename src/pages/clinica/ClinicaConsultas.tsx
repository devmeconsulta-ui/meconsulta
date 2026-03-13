import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, Filter, ChevronDown, Globe, Building2, Eye, Trash2, Loader2, Edit, Timer, CalendarIcon, RotateCcw, Users } from "lucide-react";
import { format, subDays, addDays, parseISO, differenceInMinutes, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConsultaDetalhesModal } from "@/components/clinica/ConsultaDetalhesModal";
import { EditarConsultaModal } from "@/components/shared/EditarConsultaModal";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Componente para mostrar tempo (restante ou de espera)
function TempoEspera({ dataHora }: { dataHora: string }) {
  const [info, setInfo] = useState({ minutos: 0, atrasado: false });

  useEffect(() => {
    const calcular = () => {
      const agora = new Date();
      const horaConsulta = parseISO(dataHora);
      const diff = differenceInMinutes(agora, horaConsulta);
      
      if (diff >= 0) {
        // Já passou do horário - mostra tempo de espera/atraso
        setInfo({ minutos: diff, atrasado: true });
      } else {
        // Ainda não chegou - mostra tempo restante (máx 60 min)
        const restante = Math.abs(diff);
        if (restante <= 60) {
          setInfo({ minutos: restante, atrasado: false });
        } else {
          setInfo({ minutos: 0, atrasado: false });
        }
      }
    };

    calcular();
    const interval = setInterval(calcular, 30000);

    return () => clearInterval(interval);
  }, [dataHora]);

  if (!info.atrasado && info.minutos === 0) return null;

  if (info.atrasado) {
    return (
      <Badge className="bg-red-500/10 text-red-600 gap-1 animate-pulse">
        <Timer className="w-3 h-3" />
        {info.minutos} min atrasado
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-500/10 text-green-600 gap-1">
      <Timer className="w-3 h-3" />
      Falta {info.minutos} min
    </Badge>
  );
}

type PeriodFilter = "hoje" | "ultimos7" | "proximos7" | "ultimos15" | "proximos15" | "ultimos30" | "proximos30" | "ultimos60" | "ultimos90" | "custom";

export default function ClinicaConsultas() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<any>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [consultaToEdit, setConsultaToEdit] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("hoje");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [ordemChegadaFilter, setOrdemChegadaFilter] = useState(false);
  
  // Custom date range
  const [customDateStart, setCustomDateStart] = useState<Date | undefined>(undefined);
  const [customDateEnd, setCustomDateEnd] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    
    if (periodFilter === "custom" && customDateStart && customDateEnd) {
      return { start: startOfDay(customDateStart), end: endOfDay(customDateEnd) };
    }
    
    switch (periodFilter) {
      case "hoje":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "ultimos7":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "proximos7":
        return { start: startOfDay(now), end: endOfDay(addDays(now, 7)) };
      case "ultimos15":
        return { start: startOfDay(subDays(now, 15)), end: endOfDay(now) };
      case "proximos15":
        return { start: startOfDay(now), end: endOfDay(addDays(now, 15)) };
      case "ultimos30":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "proximos30":
        return { start: startOfDay(now), end: endOfDay(addDays(now, 30)) };
      case "ultimos60":
        return { start: startOfDay(subDays(now, 60)), end: endOfDay(now) };
      case "ultimos90":
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, [periodFilter, customDateStart, customDateEnd]);
  
  const handlePeriodChange = (value: string) => {
    if (value === "custom") {
      setDatePickerOpen(true);
    } else {
      setPeriodFilter(value as PeriodFilter);
      setCustomDateStart(undefined);
      setCustomDateEnd(undefined);
    }
  };
  
  const handleCustomDateApply = () => {
    if (customDateStart && customDateEnd) {
      setPeriodFilter("custom");
      setDatePickerOpen(false);
    }
  };
  
  const getDisplayPeriod = () => {
    if (periodFilter === "custom" && customDateStart && customDateEnd) {
      return `${format(customDateStart, "dd/MM/yy", { locale: ptBR })} - ${format(customDateEnd, "dd/MM/yy", { locale: ptBR })}`;
    }
    const labels: Record<string, string> = {
      "hoje": "Hoje",
      "ultimos7": "Últimos 7 dias",
      "proximos7": "Próximos 7 dias",
      "ultimos15": "Últimos 15 dias",
      "proximos15": "Próximos 15 dias",
      "ultimos30": "Últimos 30 dias",
      "proximos30": "Próximos 30 dias",
      "ultimos60": "Últimos 60 dias",
      "ultimos90": "Últimos 90 dias",
    };
    return labels[periodFilter] || "Hoje";
  };

  // Get linked doctors
  const { data: medicos } = useQuery({
    queryKey: ["clinica-medicos-list", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data } = await supabase
        .from("clinicas_medicos")
        .select("medico_id, medicos(id, nome)")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      return data?.map((v: any) => v.medicos).filter(Boolean) || [];
    },
    enabled: !!clinicaData?.id,
  });

  const { data: consultas, isLoading } = useQuery({
    queryKey: ["clinica-consultas", clinicaData?.id, dateRange],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      // Get linked doctors
      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      const medicoIds = vinculos?.map((v) => v.medico_id) || [];
      if (medicoIds.length === 0) return [];

      // Buscar consultas pelos médicos vinculados à clínica
      // Considera tanto consultas com clinica_id da clínica quanto consultas dos médicos vinculados
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          valor_consulta,
          nome_paciente_consulta,
          origem,
          medico_id,
          clinica_id,
          motivo_consulta,
          sintomas,
          observacoes_paciente,
          tipo_atendimento,
          convenio_id,
          agenda_slot_id,
          medico:medicos!consultas_medico_id_fkey(nome, especialidade),
          paciente:pacientes(nome, cpf, telefone),
          local:locais_atendimento(nome_local, clinica_id),
          convenio:convenios(id, nome),
          slot:agenda_slots!consultas_agenda_slot_id_fkey(tipo_slot, ordem_chegada, hora_chegada)
        `)
        .in("medico_id", medicoIds)
        .gte("data_hora", dateRange.start.toISOString())
        .lte("data_hora", dateRange.end.toISOString())
        .order("data_hora", { ascending: false });
      
      // Filtra para mostrar apenas consultas que:
      // 1. Têm clinica_id igual à clínica atual, OU
      // 2. Têm local com clinica_id igual à clínica atual
      const filteredData = data?.filter((c: any) => 
        c.clinica_id === clinicaData.id || 
        c.local?.clinica_id === clinicaData.id
      ) || [];

      if (error) throw error;
      return filteredData;
    },
    enabled: !!clinicaData?.id,
  });

  // Prioridade de status (menor = mais importante)
  const statusPriority: Record<string, number> = {
    atendendo: 1,
    aguardando: 2,
    confirmada: 3,
    agendada: 4,
    aguardando_pagamento: 5,
    concluida: 6,
    nao_compareceu: 7,
    cancelada: 8,
  };

  const filteredConsultas = useMemo(() => {
    if (!consultas) return [];
    
    const filtered = consultas.filter((c: any) => {
      const matchSearch = 
        c.medico?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.paciente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.nome_paciente_consulta?.toLowerCase().includes(search.toLowerCase());

      const matchMedico = medicoFilter === "todos" || c.medico_id === medicoFilter;

      const matchStatus = statusFilter === "todos" || c.status_consulta === statusFilter;

      const matchOrigem = origemFilter === "todos" || c.origem === origemFilter;

      return matchSearch && matchMedico && matchStatus && matchOrigem;
    });

    // Se filtro de ordem de chegada ativo, ordena por horário e depois por ordem_chegada
    if (ordemChegadaFilter) {
      return filtered.sort((a: any, b: any) => {
        // Quem já chegou (tem ordem_chegada) vem primeiro
        const aChegou = a.slot?.ordem_chegada != null;
        const bChegou = b.slot?.ordem_chegada != null;
        
        if (aChegou && !bChegou) return -1;
        if (!aChegou && bChegou) return 1;
        
        // Ambos chegaram: ordena por ordem_chegada
        if (aChegou && bChegou) {
          return (a.slot.ordem_chegada || 0) - (b.slot.ordem_chegada || 0);
        }
        
        // Nenhum chegou: ordena por horário
        return new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime();
      });
    }

    // Ordenar por prioridade de status e depois por data
    return filtered.sort((a: any, b: any) => {
      const priorityA = statusPriority[a.status_consulta] ?? 99;
      const priorityB = statusPriority[b.status_consulta] ?? 99;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      const dateA = new Date(a.data_hora).getTime();
      const dateB = new Date(b.data_hora).getTime();
      
      if (priorityA >= 6) {
        return dateB - dateA;
      }
      
      if (dateA !== dateB) return dateA - dateB;

      // Mesmo horário: ordena por ordem_chegada
      const ordemA = a.slot?.ordem_chegada ?? 9999;
      const ordemB = b.slot?.ordem_chegada ?? 9999;
      return ordemA - ordemB;
    });
  }, [consultas, search, medicoFilter, statusFilter, origemFilter, ordemChegadaFilter]);

  // Count pending and cancelled consultations
  const pendingCount = useMemo(() => {
    if (!consultas) return 0;
    return consultas.filter((c: any) => c.status_consulta === "aguardando_pagamento").length;
  }, [consultas]);

  const cancelledCount = useMemo(() => {
    if (!consultas) return 0;
    return consultas.filter((c: any) => c.status_consulta === "cancelada").length;
  }, [consultas]);

  const cleanupCount = pendingCount + cancelledCount;

  // Delete all pending and cancelled consultations
  const handleDeleteCleanup = async () => {
    if (!consultas || cleanupCount === 0) return;

    setIsDeleting(true);
    try {
      const cleanupConsultas = consultas.filter((c: any) => 
        c.status_consulta === "aguardando_pagamento" || c.status_consulta === "cancelada"
      );
      const cleanupIds = cleanupConsultas.map((c: any) => c.id);
      const slotIds = cleanupConsultas.map((c: any) => c.agenda_slot_id).filter(Boolean);

      // Delete consultas
      const { error: deleteError } = await supabase
        .from("consultas")
        .delete()
        .in("id", cleanupIds);

      if (deleteError) throw deleteError;

      // Reopen agenda slots
      if (slotIds.length > 0) {
        await supabase
          .from("agenda_slots")
          .update({ disponivel: true })
          .in("id", slotIds);
      }

      toast({
        title: "Consultas excluídas",
        description: `${cleanupIds.length} consulta(s) foram removidas (${pendingCount} pendentes, ${cancelledCount} canceladas).`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["clinica-consultas"] });
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Erro ao excluir consultas:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir as consultas.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string, dataHora?: string) => {
    switch (status) {
      case "agendada":
        return <Badge className="bg-slate-500">Agendada</Badge>;
      case "aguardando_pagamento":
        return <Badge className="bg-yellow-500">Aguardando Pagamento</Badge>;
      case "confirmada":
        return <Badge className="bg-blue-500">Confirmada</Badge>;
      case "aguardando":
        return (
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500">Aguardando</Badge>
            {dataHora && <TempoEspera dataHora={dataHora} />}
          </div>
        );
      case "atendendo":
        return <Badge className="bg-purple-500">Atendendo</Badge>;
      case "concluida":
        return <Badge className="bg-emerald-500">Concluída</Badge>;
      case "nao_compareceu":
        return <Badge variant="destructive">Não Compareceu</Badge>;
      case "cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consultas</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as consultas realizadas na clínica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={periodFilter === "custom" ? "custom" : periodFilter} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[200px]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{getDisplayPeriod()}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="ultimos7">Últimos 7 dias</SelectItem>
              <SelectItem value="proximos7">Próximos 7 dias</SelectItem>
              <SelectItem value="ultimos15">Últimos 15 dias</SelectItem>
              <SelectItem value="proximos15">Próximos 15 dias</SelectItem>
              <SelectItem value="ultimos30">Últimos 30 dias</SelectItem>
              <SelectItem value="proximos30">Próximos 30 dias</SelectItem>
              <SelectItem value="ultimos60">Últimos 60 dias</SelectItem>
              <SelectItem value="ultimos90">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Período personalizado
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Selecione o período</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateStart ? format(customDateStart, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateStart}
                        onSelect={setCustomDateStart}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customDateEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateEnd ? format(customDateEnd, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customDateEnd}
                        onSelect={setCustomDateEnd}
                        disabled={(date) => customDateStart ? date < customDateStart : false}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDatePickerOpen(false);
                    setCustomDateStart(undefined);
                    setCustomDateEnd(undefined);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCustomDateApply}
                  disabled={!customDateStart || !customDateEnd}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button 
          variant={ordemChegadaFilter ? "default" : "outline"} 
          className="gap-2"
          onClick={() => setOrdemChegadaFilter(!ordemChegadaFilter)}
        >
          <Users className="w-4 h-4" />
          Ordem de Chegada
          {ordemChegadaFilter && (
            <Badge variant="secondary" className="ml-1 bg-primary-foreground text-primary text-xs px-1.5">
              ON
            </Badge>
          )}
        </Button>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="flex-1">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Médico ou paciente..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Médico</label>
                  <Select value={medicoFilter} onValueChange={setMedicoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {medicos?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          Dr(a). {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="agendada">Agendada</SelectItem>
                      <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="aguardando">Aguardando</SelectItem>
                      <SelectItem value="atendendo">Atendendo</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="nao_compareceu">Não Compareceu</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Origem</label>
                  <Select value={origemFilter} onValueChange={setOrigemFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="interna">Interna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
        </Collapsible>

        {/* Delete pending/cancelled button */}
        {cleanupCount > 0 && (
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Limpar ({cleanupCount})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar consultas?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Esta ação irá excluir:</p>
                  <ul className="list-disc list-inside text-sm">
                    {pendingCount > 0 && <li><strong>{pendingCount}</strong> consulta(s) aguardando pagamento</li>}
                    {cancelledCount > 0 && <li><strong>{cancelledCount}</strong> consulta(s) canceladas</li>}
                  </ul>
                  <p className="pt-2">Os horários serão liberados na agenda. Esta ação não pode ser desfeita.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCleanup}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir {cleanupCount} consulta(s)
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Consultas ({filteredConsultas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredConsultas?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma consulta encontrada.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultas.map((consulta: any) => (
                <Card key={consulta.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setSelectedConsulta(consulta);
                  setDetalhesOpen(true);
                }}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">
                            {consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente não informado"}
                          </p>
                          <Badge variant={consulta.origem === "online" ? "default" : "secondary"} className="gap-1">
                            {consulta.origem === "online" ? (
                              <>
                                <Globe className="w-3 h-3" />
                                Online
                              </>
                            ) : (
                              <>
                                <Building2 className="w-3 h-3" />
                                Interna
                              </>
                            )}
                          </Badge>
                          {consulta.slot?.tipo_slot === "ordem_chegada" && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 gap-1">
                              <Users className="w-3 h-3" />
                              Ordem de Chegada
                              {consulta.slot?.ordem_chegada != null && ` #${consulta.slot.ordem_chegada}`}
                            </Badge>
                          )}
                          {consulta.tipo_atendimento === "convenio" && consulta.convenio?.nome && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
                              {consulta.convenio.nome}
                            </Badge>
                          )}
                          {consulta.tipo_servico === "retorno" && consulta.valor_consulta === 0 && (
                            <Badge className="bg-green-600 text-white gap-1">
                              <RotateCcw className="w-3 h-3" />
                              Retorno 30d (R$ 0)
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Dr(a). {consulta.medico?.nome} • {consulta.medico?.especialidade}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {consulta.local?.nome_local && ` • ${consulta.local.nome_local}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConsultaToEdit(consulta);
                            setEditModalOpen(true);
                          }}
                          title="Editar consulta"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConsulta(consulta);
                            setDetalhesOpen(true);
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-bold text-primary">
                          R$ {consulta.valor_consulta?.toFixed(2)}
                        </span>
                        {getStatusBadge(consulta.status_consulta, consulta.data_hora)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConsultaDetalhesModal
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        consulta={selectedConsulta}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["clinica-consultas"] })}
      />

      {/* Edit Modal */}
      {consultaToEdit && (
        <EditarConsultaModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          consulta={consultaToEdit}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["clinica-consultas"] })}
        />
      )}
    </div>
  );
}

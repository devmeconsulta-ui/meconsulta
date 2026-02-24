import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmacaoAgenda } from "@/hooks/useConfirmacaoAgenda";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Send,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Filter,
  ChevronDown,
  Phone,
  User,
  Stethoscope,
  RefreshCw,
  Settings2,
  History,
  BarChart3,
  Search,
  CalendarDays,
  Timer,
  Users,
} from "lucide-react";
import { format, addDays, isToday, isTomorrow, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const MENSAGEM_PADRAO = `Olá {{nome_paciente}}! 👋

Lembramos que você tem uma consulta agendada:

🩺 *Médico:* {{nome_medico}} ({{especialidade}})
📅 *Data:* {{data}} às {{horario}}
📍 *Local:* {{local}}

⏰ Por favor, chegue 15 minutos antes do horário.

Confirme sua presença clicando no link abaixo:
{{link_confirmacao}}

*MeConsulta*`;

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-slate-100 text-slate-700",
  enviada: "bg-amber-100 text-amber-700",
  confirmada: "bg-emerald-100 text-emerald-700",
  recusada: "bg-rose-100 text-rose-700",
  erro: "bg-red-100 text-red-700",
  expirada: "bg-gray-100 text-gray-700",
};

const CHART_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1"];

export default function OmniConfirmacaoAgenda() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId || null;

  const {
    confirmacoes,
    consultasDisponiveis,
    filas,
    medicosClinica,
    metrics,
    isLoadingConfirmacoes,
    isLoadingConsultas,
    isSending,
    sendProgress,
    sendConfirmations,
    refetchConfirmacoes,
    refetchConsultas,
  } = useConfirmacaoAgenda(clinicaId);

  // Estados
  const [selectedConsultas, setSelectedConsultas] = useState<string[]>([]);
  const [selectedFila, setSelectedFila] = useState<string>("");
  const [mensagemTemplate, setMensagemTemplate] = useState(MENSAGEM_PADRAO);
  const [intervaloEnvio, setIntervaloEnvio] = useState([4]); // segundos
  const [filterPeriodo, setFilterPeriodo] = useState<string>("amanha");
  const [filterMedico, setFilterMedico] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMultiDoctorWarning, setShowMultiDoctorWarning] = useState(false);
  
  // Novos estados para agendamento
  const [modoEnvio, setModoEnvio] = useState<"agora" | "agendar">("agora");
  const [horarioAgendado, setHorarioAgendado] = useState("06:00");
  const [incluirOrdemChegada, setIncluirOrdemChegada] = useState(false);

  // Filtros globais para dashboard/histórico/gráficos
  const [globalPeriodo, setGlobalPeriodo] = useState<string>("todos");
  const [globalMedico, setGlobalMedico] = useState<string>("todos");
  const [globalStatus, setGlobalStatus] = useState<string>("todos");
  const [globalDateRange, setGlobalDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Carregar automaticamente consultas de amanhã ao montar
  useEffect(() => {
    setFilterPeriodo("amanha");
  }, []);

  // Filtrar consultas disponíveis
  const consultasFiltradas = useMemo(() => {
    let result = [...consultasDisponiveis] as any[];

    // Filtro por período
    const hoje = new Date();
    if (filterPeriodo === "hoje") {
      result = result.filter((c: any) => isToday(new Date(c.data_hora)));
    } else if (filterPeriodo === "amanha") {
      result = result.filter((c: any) => isTomorrow(new Date(c.data_hora)));
    } else if (filterPeriodo === "proximos3") {
      const limite = addDays(hoje, 3);
      result = result.filter((c: any) => {
        const dataConsulta = new Date(c.data_hora);
        return dataConsulta >= startOfDay(hoje) && dataConsulta <= endOfDay(limite);
      });
    } else if (filterPeriodo === "proximos7") {
      const limite = addDays(hoje, 7);
      result = result.filter((c: any) => new Date(c.data_hora) <= limite);
    } else if (filterPeriodo === "proximos30") {
      const limite = addDays(hoje, 30);
      result = result.filter((c: any) => new Date(c.data_hora) <= limite);
    }

    // Filtro por médico
    if (filterMedico !== "todos") {
      result = result.filter((c: any) => c.medico?.id === filterMedico);
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c: any) =>
          c.paciente?.nome?.toLowerCase().includes(term) ||
          c.paciente?.telefone?.includes(term) ||
          c.medico?.nome?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [consultasDisponiveis, filterPeriodo, filterMedico, searchTerm]);

  // Lista de médicos para filtro - usa a lista de médicos da clínica
  const medicos = medicosClinica;

  // Confirmações filtradas para dashboard/histórico/gráficos
  const confirmacoesFiltradas = useMemo(() => {
    let result = [...confirmacoes];
    const hoje = new Date();

    // Filtro por período
    if (globalPeriodo !== "todos") {
      if (globalPeriodo === "hoje") {
        result = result.filter((c: any) => c.created_at && isToday(parseISO(c.created_at)));
      } else if (globalPeriodo === "ultimos7") {
        const limite = subDays(hoje, 7);
        result = result.filter((c: any) => c.created_at && parseISO(c.created_at) >= limite);
      } else if (globalPeriodo === "ultimos30") {
        const limite = subDays(hoje, 30);
        result = result.filter((c: any) => c.created_at && parseISO(c.created_at) >= limite);
      } else if (globalPeriodo === "mesAtual") {
        const inicio = startOfMonth(hoje);
        const fim = endOfMonth(hoje);
        result = result.filter((c: any) => 
          c.created_at && isWithinInterval(parseISO(c.created_at), { start: inicio, end: fim })
        );
      } else if (globalPeriodo === "mesAnterior") {
        const mesAnterior = subMonths(hoje, 1);
        const inicio = startOfMonth(mesAnterior);
        const fim = endOfMonth(mesAnterior);
        result = result.filter((c: any) => 
          c.created_at && isWithinInterval(parseISO(c.created_at), { start: inicio, end: fim })
        );
      } else if (globalPeriodo === "personalizado" && globalDateRange.from) {
        const inicio = startOfDay(globalDateRange.from);
        const fim = globalDateRange.to ? endOfDay(globalDateRange.to) : endOfDay(globalDateRange.from);
        result = result.filter((c: any) => 
          c.created_at && isWithinInterval(parseISO(c.created_at), { start: inicio, end: fim })
        );
      }
    }

    // Filtro por médico
    if (globalMedico !== "todos") {
      result = result.filter((c: any) => c.consulta?.medico?.id === globalMedico);
    }

    // Filtro por status
    if (globalStatus !== "todos") {
      result = result.filter((c: any) => c.status === globalStatus);
    }

    return result;
  }, [confirmacoes, globalPeriodo, globalMedico, globalStatus, globalDateRange]);

  // Métricas filtradas
  const metricsFiltradas = useMemo(() => {
    const total = confirmacoesFiltradas.length;
    const enviadas = confirmacoesFiltradas.filter((c: any) => c.status === "enviada").length;
    const confirmadas = confirmacoesFiltradas.filter((c: any) => c.status === "confirmada").length;
    const recusadas = confirmacoesFiltradas.filter((c: any) => c.status === "recusada").length;
    const aguardando = enviadas; // enviadas = aguardando resposta
    const erros = confirmacoesFiltradas.filter((c: any) => c.status === "erro").length;
    const taxaConfirmacao = 
      total > 0
        ? Math.round(
            (confirmadas / confirmacoesFiltradas.filter((c: any) =>
              ["confirmada", "recusada"].includes(c.status)
            ).length) * 100
          ) || 0
        : 0;

    return { total, enviadas, confirmadas, recusadas, aguardando, erros, taxaConfirmacao };
  }, [confirmacoesFiltradas]);

  // Dados para gráficos
  const pieData = useMemo(() => {
    return [
      { name: "Confirmadas", value: metricsFiltradas.confirmadas, color: "#10b981" },
      { name: "Aguardando", value: metricsFiltradas.aguardando, color: "#f59e0b" },
      { name: "Recusadas", value: metricsFiltradas.recusadas, color: "#ef4444" },
      { name: "Erros", value: metricsFiltradas.erros, color: "#6366f1" },
    ].filter((d) => d.value > 0);
  }, [metricsFiltradas]);

  // Label para o período selecionado
  const getPeriodoLabel = () => {
    switch (globalPeriodo) {
      case "hoje": return "Hoje";
      case "ultimos7": return "Últimos 7 dias";
      case "ultimos30": return "Últimos 30 dias";
      case "mesAtual": return "Mês atual";
      case "mesAnterior": return "Mês anterior";
      case "personalizado": 
        if (globalDateRange.from && globalDateRange.to) {
          return `${format(globalDateRange.from, "dd/MM")} - ${format(globalDateRange.to, "dd/MM")}`;
        } else if (globalDateRange.from) {
          return format(globalDateRange.from, "dd/MM/yyyy");
        }
        return "Selecionar período";
      default: return "Todos";
    }
  };

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConsultas(consultasFiltradas.map((c) => c.id));
    } else {
      setSelectedConsultas([]);
    }
  };

  const handleSelectConsulta = (consultaId: string, checked: boolean) => {
    if (checked) {
      setSelectedConsultas([...selectedConsultas, consultaId]);
    } else {
      setSelectedConsultas(selectedConsultas.filter((id) => id !== consultaId));
    }
  };

  // Detectar médicos únicos nas consultas selecionadas
  const medicosSelecionados = useMemo(() => {
    const medicosMap = new Map<string, string>();
    consultasDisponiveis.forEach((c: any) => {
      if (selectedConsultas.includes(c.id) && c.medico?.id) {
        medicosMap.set(c.medico.id, c.medico.nome);
      }
    });
    return Array.from(medicosMap.entries()).map(([id, nome]) => ({ id, nome }));
  }, [selectedConsultas, consultasDisponiveis]);

  // Mudar filtro de médico limpa a seleção
  const handleFilterMedicoChange = (value: string) => {
    setFilterMedico(value);
    setSelectedConsultas([]);
  };

  // Mudar filtro de período limpa a seleção
  const handleFilterPeriodoChange = (value: string) => {
    setFilterPeriodo(value);
    setSelectedConsultas([]);
  };

  const handleEnviar = async () => {
    if (!selectedFila) {
      alert("Selecione uma fila de envio");
      return;
    }

    if (selectedConsultas.length === 0) {
      alert("Selecione pelo menos uma consulta");
      return;
    }

    // Verificar se há múltiplos médicos selecionados
    if (medicosSelecionados.length > 1) {
      const nomesMedicos = medicosSelecionados.map(m => m.nome).join(", ");
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO: Você selecionou pacientes de ${medicosSelecionados.length} médicos diferentes:\n\n${nomesMedicos}\n\nCada paciente receberá a mensagem com o nome do SEU médico correto.\n\nDeseja continuar?`
      );
      if (!confirmar) return;
    }

    // Calcular data de agendamento se modo for agendar
    let agendarPara: string | null = null;
    if (modoEnvio === "agendar") {
      const amanha = addDays(new Date(), 1);
      const [hora, minuto] = horarioAgendado.split(":").map(Number);
      amanha.setHours(hora, minuto, 0, 0);
      agendarPara = amanha.toISOString();
    }

    await sendConfirmations({
      consulta_ids: selectedConsultas,
      fila_id: selectedFila,
      clinica_id: clinicaId!,
      mensagem_template: mensagemTemplate,
      intervalo_min: (intervaloEnvio[0] - 1) * 1000,
      intervalo_max: (intervaloEnvio[0] + 1) * 1000,
      agendar_para: agendarPara,
      ordem_chegada: incluirOrdemChegada,
    });

    setSelectedConsultas([]);
  };

  return (
    <OmniLayout clinicaId={clinicaId || undefined}>
      <div className="space-y-6">
        {/* Header da página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Confirmação de Agenda</h1>
            <p className="text-muted-foreground">
              Envie confirmações de consultas via WhatsApp
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchConfirmacoes();
                refetchConsultas();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros Globais - Inline */}
        <div className="flex flex-wrap items-center gap-2 bg-muted/30 rounded-lg p-3 border border-dashed">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtros:</span>
          </div>
          
          {/* Filtro de Período */}
          <Select value={globalPeriodo} onValueChange={(val) => {
            setGlobalPeriodo(val);
            setGlobalDateRange({ from: undefined, to: undefined });
          }}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="ultimos7">7 dias</SelectItem>
              <SelectItem value="ultimos30">30 dias</SelectItem>
              <SelectItem value="mesAtual">Mês atual</SelectItem>
              <SelectItem value="mesAnterior">Mês anterior</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Médico */}
          <Select value={globalMedico} onValueChange={setGlobalMedico}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <Stethoscope className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Médico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {medicos.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de Status */}
          <Select value={globalStatus} onValueChange={setGlobalStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="recusada">Recusada</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
              <SelectItem value="agendada">Agendada</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão limpar filtros */}
          {(globalPeriodo !== "todos" || globalMedico !== "todos" || globalStatus !== "todos") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                setGlobalPeriodo("todos");
                setGlobalMedico("todos");
                setGlobalStatus("todos");
                setGlobalDateRange({ from: undefined, to: undefined });
              }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Total Enviadas
                  </p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {metricsFiltradas.total}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                  <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Confirmadas
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    {metricsFiltradas.confirmadas}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/50 dark:to-rose-900/50 border-rose-200 dark:border-rose-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Recusadas
                  </p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    {metricsFiltradas.recusadas}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-rose-200 dark:bg-rose-800 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Aguardando
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    {metricsFiltradas.aguardando}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/50 border-violet-200 dark:border-violet-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                    Taxa Confirmação
                  </p>
                  <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                    {metricsFiltradas.taxaConfirmacao}%
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Falhas
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {metricsFiltradas.erros}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-200 dark:bg-red-800 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="enviar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="enviar" className="gap-2">
              <Send className="h-4 w-4" />
              Enviar Confirmações
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="graficos" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
          </TabsList>

          {/* Tab Enviar */}
          <TabsContent value="enviar" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Configuração de envio */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Configuração de Envio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Seleção de fila */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Fila de Envio (WhatsApp)
                    </label>
                    <Select value={selectedFila} onValueChange={setSelectedFila}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {filas.map((fila: any) => (
                          <SelectItem key={fila.id} value={fila.id}>
                            {fila.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filas.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma fila com WhatsApp conectado
                      </p>
                    )}
                  </div>

                  {/* Modo de envio */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Quando enviar?</label>
                    <RadioGroup value={modoEnvio} onValueChange={(v) => setModoEnvio(v as "agora" | "agendar")}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="agora" id="agora" />
                        <Label htmlFor="agora" className="text-sm cursor-pointer">
                          Enviar agora
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="agendar" id="agendar" />
                        <Label htmlFor="agendar" className="text-sm cursor-pointer">
                          Agendar envio
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {modoEnvio === "agendar" && (
                      <div className="space-y-2 pl-6">
                        <label className="text-xs text-muted-foreground">Horário do envio</label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={horarioAgendado === "06:00" ? "default" : "outline"}
                            onClick={() => setHorarioAgendado("06:00")}
                            className="flex-1"
                          >
                            <Timer className="h-3 w-3 mr-1" />
                            6h
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={horarioAgendado === "07:00" ? "default" : "outline"}
                            onClick={() => setHorarioAgendado("07:00")}
                            className="flex-1"
                          >
                            7h
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={horarioAgendado === "08:00" ? "default" : "outline"}
                            onClick={() => setHorarioAgendado("08:00")}
                            className="flex-1"
                          >
                            8h
                          </Button>
                        </div>
                        <Input
                          type="time"
                          value={horarioAgendado}
                          onChange={(e) => setHorarioAgendado(e.target.value)}
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          As mensagens serão enviadas automaticamente no horário selecionado
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Intervalo */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Intervalo entre mensagens: {intervaloEnvio[0]}s
                    </label>
                    <Slider
                      value={intervaloEnvio}
                      onValueChange={setIntervaloEnvio}
                      min={3}
                      max={10}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Intervalo maior = menor risco de bloqueio
                    </p>
                  </div>

                  {/* Mensagem */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Mensagem Personalizada
                    </label>
                    <Textarea
                      value={mensagemTemplate}
                      onChange={(e) => setMensagemTemplate(e.target.value)}
                      rows={8}
                      className="text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {"{{nome_paciente}}"}, {"{{nome_medico}}"},{" "}
                      {"{{especialidade}}"}, {"{{data}}"}, {"{{horario}}"},{" "}
                      {"{{local}}"}, {"{{link_confirmacao}}"}
                    </p>

                    {/* Ordem de Chegada checkbox */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <Checkbox
                        id="ordem-chegada"
                        checked={incluirOrdemChegada}
                        onCheckedChange={(checked) => setIncluirOrdemChegada(!!checked)}
                        className="mt-0.5"
                      />
                      <div>
                        <label htmlFor="ordem-chegada" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          Incluir aviso de Ordem de Chegada
                        </label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Adiciona uma observação de que o atendimento será por ordem de chegada no local.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Aviso de múltiplos médicos */}
                  {medicosSelecionados.length > 1 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-amber-800 dark:text-amber-300">
                            {medicosSelecionados.length} médicos selecionados
                          </p>
                          <ul className="mt-1 text-amber-700 dark:text-amber-400 space-y-0.5">
                            {medicosSelecionados.map(m => (
                              <li key={m.id}>• {m.nome}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-amber-600 dark:text-amber-500">
                            Cada paciente receberá o nome do seu médico correto.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botão de envio */}
                  <Button
                    onClick={handleEnviar}
                    disabled={
                      isSending ||
                      selectedConsultas.length === 0 ||
                      !selectedFila
                    }
                    className="w-full"
                  >
                    {isSending ? (
                      <>
                        Enviando...
                        <span className="ml-2">
                          ({sendProgress.current}/{sendProgress.total})
                        </span>
                      </>
                    ) : modoEnvio === "agendar" ? (
                      <>
                        <Clock className="h-4 w-4 mr-2" />
                        Agendar {selectedConsultas.length} para {horarioAgendado}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar para {selectedConsultas.length} Selecionados
                      </>
                    )}
                  </Button>

                  {isSending && (
                    <Progress
                      value={
                        (sendProgress.current / sendProgress.total) * 100 || 0
                      }
                    />
                  )}
                </CardContent>
              </Card>

              {/* Lista de consultas */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Consultas Disponíveis ({consultasFiltradas.length})
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {selectedConsultas.length} selecionadas
                      </Badge>
                    </div>

                    {/* Filtros rápidos por período */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={filterPeriodo === "hoje" ? "default" : "outline"}
                        onClick={() => handleFilterPeriodoChange("hoje")}
                        className="h-8"
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Hoje
                        {filterPeriodo !== "hoje" && consultasDisponiveis.filter((c: any) => isToday(new Date(c.data_hora))).length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {consultasDisponiveis.filter((c: any) => isToday(new Date(c.data_hora))).length}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={filterPeriodo === "amanha" ? "default" : "outline"}
                        onClick={() => handleFilterPeriodoChange("amanha")}
                        className="h-8"
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Amanhã
                        {filterPeriodo !== "amanha" && consultasDisponiveis.filter((c: any) => isTomorrow(new Date(c.data_hora))).length > 0 && (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                            {consultasDisponiveis.filter((c: any) => isTomorrow(new Date(c.data_hora))).length}
                          </Badge>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={filterPeriodo === "proximos3" ? "default" : "outline"}
                        onClick={() => handleFilterPeriodoChange("proximos3")}
                        className="h-8"
                      >
                        Próx. 3 dias
                      </Button>
                      <Button
                        size="sm"
                        variant={filterPeriodo === "proximos7" ? "default" : "outline"}
                        onClick={() => handleFilterPeriodoChange("proximos7")}
                        className="h-8"
                      >
                        Próx. 7 dias
                      </Button>
                      <Button
                        size="sm"
                        variant={filterPeriodo === "todos" ? "default" : "outline"}
                        onClick={() => handleFilterPeriodoChange("todos")}
                        className="h-8"
                      >
                        Todos
                      </Button>
                    </div>

                    {/* Busca e filtro por médico */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por paciente, telefone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select
                        value={filterMedico}
                        onValueChange={handleFilterMedicoChange}
                      >
                        <SelectTrigger>
                          <Stethoscope className="h-4 w-4 mr-2 text-muted-foreground" />
                          <SelectValue placeholder="Filtrar por médico" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os médicos</SelectItem>
                          {medicos.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ações rápidas */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAll(true)}
                        disabled={consultasFiltradas.length === 0}
                        className="h-8"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Selecionar todos ({consultasFiltradas.length})
                      </Button>
                      {selectedConsultas.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedConsultas([])}
                          className="h-8"
                        >
                          Limpar seleção
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                consultasFiltradas.length > 0 &&
                                selectedConsultas.length ===
                                  consultasFiltradas.length
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Médico</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Telefone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingConsultas ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              Carregando...
                            </TableCell>
                          </TableRow>
                        ) : consultasFiltradas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Calendar className="h-8 w-8 opacity-50" />
                                <p>Nenhuma consulta disponível para este período</p>
                                <p className="text-xs">Tente selecionar outro período ou remover os filtros</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          consultasFiltradas.map((consulta) => (
                            <TableRow 
                              key={consulta.id}
                              className={selectedConsultas.includes(consulta.id) ? "bg-primary/5" : ""}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedConsultas.includes(consulta.id)}
                                  onCheckedChange={(checked) =>
                                    handleSelectConsulta(
                                      consulta.id,
                                      checked as boolean
                                    )
                                  }
                                  disabled={!consulta.paciente?.telefone}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {consulta.paciente?.nome || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">
                                      {consulta.medico?.nome || "—"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {consulta.medico?.especialidade}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">
                                      {format(
                                        new Date(consulta.data_hora),
                                        "dd/MM/yyyy",
                                        { locale: ptBR }
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(
                                        new Date(consulta.data_hora),
                                        "HH:mm"
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span
                                    className={
                                      !consulta.paciente?.telefone
                                        ? "text-muted-foreground"
                                        : ""
                                    }
                                  >
                                    {consulta.paciente?.telefone || "Sem telefone"}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Histórico */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Envios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Médico</TableHead>
                        <TableHead>Data Consulta</TableHead>
                        <TableHead>Enviado em</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Resposta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingConfirmacoes ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : confirmacoesFiltradas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            {confirmacoes.length > 0 
                              ? "Nenhum resultado para os filtros selecionados"
                              : "Nenhuma confirmação enviada ainda"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        confirmacoesFiltradas.slice(0, 50).map((conf: any) => (
                          <TableRow key={conf.id}>
                            <TableCell className="font-medium">
                              {conf.consulta?.paciente?.nome || "—"}
                            </TableCell>
                            <TableCell>
                              {conf.consulta?.medico?.nome || "—"}
                            </TableCell>
                            <TableCell>
                              {conf.consulta?.data_hora
                                ? format(
                                    new Date(conf.consulta.data_hora),
                                    "dd/MM/yyyy HH:mm",
                                    { locale: ptBR }
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {conf.data_envio
                                ? format(
                                    new Date(conf.data_envio),
                                    "dd/MM/yyyy HH:mm",
                                    { locale: ptBR }
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_COLORS[conf.status]}>
                                {conf.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {conf.data_resposta
                                ? format(
                                    new Date(conf.data_resposta),
                                    "dd/MM/yyyy HH:mm",
                                    { locale: ptBR }
                                  )
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Gráficos */}
          <TabsContent value="graficos">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Gráfico de Pizza */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Distribuição por Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card de resumo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Total de confirmações
                      </span>
                      <span className="font-bold">{metricsFiltradas.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Taxa de confirmação
                      </span>
                      <span className="font-bold text-emerald-600">
                        {metricsFiltradas.taxaConfirmacao}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Aguardando resposta
                      </span>
                      <span className="font-bold text-amber-600">
                        {metricsFiltradas.aguardando}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        Consultas disponíveis
                      </span>
                      <span className="font-bold">
                        {consultasDisponiveis.length}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Filas Conectadas</h4>
                    {filas.length > 0 ? (
                      <div className="space-y-2">
                        {filas.map((fila: any) => (
                          <div
                            key={fila.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>{fila.nome}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma fila com WhatsApp conectado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </OmniLayout>
  );
}

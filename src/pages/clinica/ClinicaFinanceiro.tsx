import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, subDays, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import {
  Clock,
  XCircle,
  DollarSign,
  TrendingUp,
  Filter,
  ChevronDown,
  Search,
  BarChart3,
  Globe,
  ArrowLeftRight,
  Wallet,
  Plus,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  CreditCard,
  Building,
  Building2,
  Users,
  Percent,
  Settings,
  FileText,
  PieChart as PieChartIcon,
} from "lucide-react";
import { toast } from "sonner";

interface ClinicaContext {
  clinicaData: any;
}

interface Consulta {
  id: string;
  data_hora: string;
  valor_consulta: number;
  valor_medico: number;
  valor_plataforma: number;
  status_consulta: string;
  status_pagamento: string;
  origem: string;
  medico_id: string;
  local_id: string | null;
  paciente: { nome: string } | null;
  medico: { nome: string; especialidade: string } | null;
  local: { nome_local: string } | null;
  nome_paciente_consulta: string | null;
  finalizado_medico: boolean;
}

interface Repasse {
  id: string;
  medico_id: string;
  valor_total: number;
  periodo_inicio: string;
  periodo_fim: string;
  data_prevista_pagamento: string | null;
  data_pagamento: string | null;
  status: string;
  medico?: { nome: string };
}

interface CentroCusto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  centro_custo_id: string | null;
  fornecedor: string | null;
  centro_custo?: { nome: string };
}

interface ContaReceber {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  cliente: string | null;
}

interface MedicoRepasseConfig {
  id: string;
  medico_id: string;
  percentual_repasse: number;
  valor_fixo_repasse: number | null;
  tipo_repasse: string;
  medico?: { nome: string };
}

type PeriodFilter = "7d" | "30d" | "60d" | "90d" | "180d" | "365d";

const COLORS = ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ClinicaFinanceiro() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [repasses, setRepasses] = useState<Repasse[]>([]);
  const [medicos, setMedicos] = useState<Array<{ id: string; nome: string }>>([]);
  const [locais, setLocais] = useState<Array<{ id: string; nome_local: string }>>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [medicoRepasseConfigs, setMedicoRepasseConfigs] = useState<MedicoRepasseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [localFilter, setLocalFilter] = useState("todos");
  const [searchPaciente, setSearchPaciente] = useState("");
  
  // Filtros customizados para aba Origem
  const [origemDateStart, setOrigemDateStart] = useState<Date | undefined>(subDays(new Date(), 30));
  const [origemDateEnd, setOrigemDateEnd] = useState<Date | undefined>(new Date());

  // Modals
  const [showCentroCustoModal, setShowCentroCustoModal] = useState(false);
  const [showContaPagarModal, setShowContaPagarModal] = useState(false);
  const [showContaReceberModal, setShowContaReceberModal] = useState(false);
  const [showRepasseConfigModal, setShowRepasseConfigModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [formCentroCusto, setFormCentroCusto] = useState({ nome: "", descricao: "" });
  const [formContaPagar, setFormContaPagar] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    fornecedor: "",
    centro_custo_id: "",
    observacoes: "",
  });
  const [formContaReceber, setFormContaReceber] = useState({
    descricao: "",
    valor: "",
    data_vencimento: "",
    cliente: "",
    observacoes: "",
  });
  const [formRepasseConfig, setFormRepasseConfig] = useState({
    medico_id: "",
    tipo_repasse: "percentual",
    percentual_repasse: "70",
    valor_fixo_repasse: "",
  });

  const dateRange = useMemo(() => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 90);
    
    switch (periodFilter) {
      case "7d":
        return { start: subDays(now, 7), end: future };
      case "30d":
        return { start: subDays(now, 30), end: future };
      case "60d":
        return { start: subDays(now, 60), end: future };
      case "90d":
        return { start: subDays(now, 90), end: future };
      case "180d":
        return { start: subDays(now, 180), end: future };
      case "365d":
        return { start: subDays(now, 365), end: future };
      default:
        return { start: subDays(now, 30), end: future };
    }
  }, [periodFilter]);

  useEffect(() => {
    if (clinicaData?.id) {
      fetchAllData();
    }
  }, [clinicaData?.id, dateRange]);

  async function fetchAllData() {
    setLoading(true);
    await Promise.all([
      fetchConsultas(),
      fetchRepasses(),
      fetchCentrosCusto(),
      fetchContasPagar(),
      fetchContasReceber(),
      fetchMedicoRepasseConfigs(),
    ]);
    setLoading(false);
  }

  async function fetchConsultas() {
    // Busca médicos vinculados
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id, medicos(id, nome)")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    const medicosVinculados = vinculosData?.map((v: any) => v.medicos).filter(Boolean) || [];
    setMedicos(medicosVinculados);

    if (medicosVinculados.length === 0) {
      setConsultas([]);
      return;
    }

    const medicoIds = medicosVinculados.map((m: any) => m.id);

    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    setLocais(locaisData || []);

    const { data, error } = await supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        valor_consulta,
        valor_medico,
        valor_plataforma,
        status_consulta,
        status_pagamento,
        origem,
        medico_id,
        local_id,
        nome_paciente_consulta,
        finalizado_medico,
        paciente:pacientes!consultas_paciente_id_fkey(nome),
        medico:medicos!consultas_medico_id_fkey(nome, especialidade),
        local:locais_atendimento!consultas_local_id_fkey(nome_local)
      `)
      .eq("clinica_id", clinicaData.id)
      .in("medico_id", medicoIds)
      .gte("data_hora", dateRange.start.toISOString())
      .lte("data_hora", dateRange.end.toISOString())
      .order("data_hora", { ascending: false });

    if (!error) {
      setConsultas(data || []);
    }
  }

  async function fetchRepasses() {
    const { data: vinculosData } = await supabase
      .from("clinicas_medicos")
      .select("medico_id")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    if (!vinculosData?.length) {
      setRepasses([]);
      return;
    }

    const medicoIds = vinculosData.map((v) => v.medico_id);

    const { data } = await supabase
      .from("repasses_medico")
      .select(`*, medico:medicos(nome)`)
      .in("medico_id", medicoIds)
      .order("created_at", { ascending: false })
      .limit(50);

    setRepasses(data || []);
  }

  async function fetchCentrosCusto() {
    const { data } = await supabase
      .from("centros_custo")
      .select("*")
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true)
      .order("nome");

    setCentrosCusto(data || []);
  }

  async function fetchContasPagar() {
    const { data } = await supabase
      .from("contas_pagar")
      .select(`*, centro_custo:centros_custo(nome)`)
      .eq("clinica_id", clinicaData.id)
      .order("data_vencimento", { ascending: true });

    setContasPagar(data || []);
  }

  async function fetchContasReceber() {
    const { data } = await supabase
      .from("contas_receber")
      .select("*")
      .eq("clinica_id", clinicaData.id)
      .order("data_vencimento", { ascending: true });

    setContasReceber(data || []);
  }

  async function fetchMedicoRepasseConfigs() {
    const { data } = await supabase
      .from("medico_repasse_config")
      .select(`*, medico:medicos(nome)`)
      .eq("clinica_id", clinicaData.id)
      .eq("ativo", true);

    setMedicoRepasseConfigs(data || []);
  }

  const filteredConsultas = useMemo(() => {
    return consultas.filter((c) => {
      const matchMedico = medicoFilter === "todos" || c.medico_id === medicoFilter;
      const matchStatus = statusFilter === "todos" || 
        (statusFilter === "pago" && c.status_pagamento === "pago") ||
        (statusFilter === "pendente" && c.status_pagamento === "pendente" && c.status_consulta !== "cancelada") ||
        (statusFilter === "cancelado" && c.status_consulta === "cancelada");
      const matchOrigem = origemFilter === "todos" || c.origem === origemFilter;
      const matchLocal = localFilter === "todos" || c.local_id === localFilter;
      const matchSearch = !searchPaciente.trim() || 
        (c.nome_paciente_consulta || c.paciente?.nome || "").toLowerCase().includes(searchPaciente.toLowerCase());

      return matchMedico && matchStatus && matchOrigem && matchLocal && matchSearch;
    });
  }, [consultas, medicoFilter, statusFilter, origemFilter, localFilter, searchPaciente]);

  const metrics = useMemo(() => {
    const onlineConsultas = filteredConsultas.filter((c) => c.origem === "online");
    
    const pago = onlineConsultas
      .filter((c) => c.status_pagamento === "pago")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const pendente = onlineConsultas
      .filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const cancelado = filteredConsultas
      .filter((c) => c.status_consulta === "cancelada")
      .reduce((sum, c) => sum + (c.valor_consulta || 0), 0);

    const total = filteredConsultas.length;
    const pagos = filteredConsultas.filter((c) => c.status_pagamento === "pago").length;

    return { pago, pendente, cancelado, total, pagos };
  }, [filteredConsultas]);

  // Dados filtrados para aba Origem com datas customizáveis
  const origemFilteredConsultas = useMemo(() => {
    if (!origemDateStart || !origemDateEnd) return filteredConsultas;
    
    return filteredConsultas.filter((c) => {
      const consultaDate = parseISO(c.data_hora);
      return isWithinInterval(consultaDate, {
        start: origemDateStart,
        end: new Date(origemDateEnd.getTime() + 24 * 60 * 60 * 1000 - 1), // Include end date fully
      });
    });
  }, [filteredConsultas, origemDateStart, origemDateEnd]);

  const originChartData = useMemo(() => {
    const online = origemFilteredConsultas.filter((c) => c.origem === "online");
    const interna = origemFilteredConsultas.filter((c) => c.origem === "interna");
    
    return [
      { name: "Online", value: online.length, receita: online.filter(c => c.status_pagamento === "pago").reduce((s, c) => s + c.valor_consulta, 0) },
      { name: "Interna", value: interna.length, receita: interna.filter(c => c.status_pagamento === "pago").reduce((s, c) => s + c.valor_consulta, 0) },
    ];
  }, [origemFilteredConsultas]);

  const cashFlowData = useMemo(() => {
    const data: { [key: string]: { entradas: number; saidas: number } } = {};
    
    // Entradas das consultas pagas
    filteredConsultas
      .filter((c) => c.status_pagamento === "pago" && c.origem === "online")
      .forEach((c) => {
        const date = format(parseISO(c.data_hora), "dd/MM");
        if (!data[date]) data[date] = { entradas: 0, saidas: 0 };
        data[date].entradas += c.valor_consulta;
      });

    // Saídas das contas pagas
    contasPagar
      .filter((c) => c.status === "pago" && c.data_pagamento)
      .forEach((c) => {
        const date = format(parseISO(c.data_pagamento!), "dd/MM");
        if (!data[date]) data[date] = { entradas: 0, saidas: 0 };
        data[date].saidas += Number(c.valor);
      });

    return Object.entries(data)
      .map(([date, values]) => ({ date, ...values, saldo: values.entradas - values.saidas }))
      .slice(-15);
  }, [filteredConsultas, contasPagar]);

  const medicoChartData = useMemo(() => {
    const data: { [key: string]: number } = {};
    filteredConsultas
      .filter((c) => c.status_pagamento === "pago" && c.origem === "online")
      .forEach((c) => {
        const medicoNome = c.medico?.nome || "Desconhecido";
        data[medicoNome] = (data[medicoNome] || 0) + c.valor_consulta;
      });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredConsultas]);

  const repassesPorMedico = useMemo(() => {
    const data: { [key: string]: { pendente: number; pago: number } } = {};
    
    filteredConsultas
      .filter((c) => c.status_pagamento === "pago" && c.finalizado_medico)
      .forEach((c) => {
        const medicoNome = c.medico?.nome || "Desconhecido";
        if (!data[medicoNome]) data[medicoNome] = { pendente: 0, pago: 0 };
        data[medicoNome].pendente += c.valor_medico;
      });

    return Object.entries(data).map(([nome, valores]) => ({
      nome,
      ...valores,
    }));
  }, [filteredConsultas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPatientName = (consulta: Consulta) => {
    return consulta.nome_paciente_consulta || consulta.paciente?.nome || "Não informado";
  };

  // CRUD handlers
  const handleSaveCentroCusto = async () => {
    if (!formCentroCusto.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (editingItem) {
      const { error } = await supabase
        .from("centros_custo")
        .update({ nome: formCentroCusto.nome, descricao: formCentroCusto.descricao })
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar");
        return;
      }
      toast.success("Centro de custo atualizado");
    } else {
      const { error } = await supabase
        .from("centros_custo")
        .insert({
          clinica_id: clinicaData.id,
          nome: formCentroCusto.nome,
          descricao: formCentroCusto.descricao,
        });

      if (error) {
        toast.error("Erro ao criar");
        return;
      }
      toast.success("Centro de custo criado");
    }

    setShowCentroCustoModal(false);
    setEditingItem(null);
    setFormCentroCusto({ nome: "", descricao: "" });
    fetchCentrosCusto();
  };

  const handleSaveContaPagar = async () => {
    if (!formContaPagar.descricao.trim() || !formContaPagar.valor || !formContaPagar.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const payload = {
      clinica_id: clinicaData.id,
      descricao: formContaPagar.descricao,
      valor: parseFloat(formContaPagar.valor),
      data_vencimento: formContaPagar.data_vencimento,
      fornecedor: formContaPagar.fornecedor || null,
      centro_custo_id: formContaPagar.centro_custo_id || null,
      observacoes: formContaPagar.observacoes || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("contas_pagar")
        .update(payload)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar");
        return;
      }
      toast.success("Conta atualizada");
    } else {
      const { error } = await supabase
        .from("contas_pagar")
        .insert(payload);

      if (error) {
        toast.error("Erro ao criar");
        return;
      }
      toast.success("Conta criada");
    }

    setShowContaPagarModal(false);
    setEditingItem(null);
    setFormContaPagar({ descricao: "", valor: "", data_vencimento: "", fornecedor: "", centro_custo_id: "", observacoes: "" });
    fetchContasPagar();
  };

  const handleSaveContaReceber = async () => {
    if (!formContaReceber.descricao.trim() || !formContaReceber.valor || !formContaReceber.data_vencimento) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const payload = {
      clinica_id: clinicaData.id,
      descricao: formContaReceber.descricao,
      valor: parseFloat(formContaReceber.valor),
      data_vencimento: formContaReceber.data_vencimento,
      cliente: formContaReceber.cliente || null,
      observacoes: formContaReceber.observacoes || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("contas_receber")
        .update(payload)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar");
        return;
      }
      toast.success("Conta atualizada");
    } else {
      const { error } = await supabase
        .from("contas_receber")
        .insert(payload);

      if (error) {
        toast.error("Erro ao criar");
        return;
      }
      toast.success("Conta criada");
    }

    setShowContaReceberModal(false);
    setEditingItem(null);
    setFormContaReceber({ descricao: "", valor: "", data_vencimento: "", cliente: "", observacoes: "" });
    fetchContasReceber();
  };

  const handleSaveRepasseConfig = async () => {
    if (!formRepasseConfig.medico_id) {
      toast.error("Selecione um médico");
      return;
    }

    const payload = {
      clinica_id: clinicaData.id,
      medico_id: formRepasseConfig.medico_id,
      tipo_repasse: formRepasseConfig.tipo_repasse,
      percentual_repasse: parseFloat(formRepasseConfig.percentual_repasse) || 70,
      valor_fixo_repasse: formRepasseConfig.valor_fixo_repasse ? parseFloat(formRepasseConfig.valor_fixo_repasse) : null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("medico_repasse_config")
        .update(payload)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar");
        return;
      }
      toast.success("Configuração atualizada");
    } else {
      const { error } = await supabase
        .from("medico_repasse_config")
        .insert(payload);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe configuração para este médico");
        } else {
          toast.error("Erro ao criar");
        }
        return;
      }
      toast.success("Configuração criada");
    }

    setShowRepasseConfigModal(false);
    setEditingItem(null);
    setFormRepasseConfig({ medico_id: "", tipo_repasse: "percentual", percentual_repasse: "70", valor_fixo_repasse: "" });
    fetchMedicoRepasseConfigs();
  };

  const handleMarkAsPaid = async (type: "pagar" | "receber", id: string) => {
    const table = type === "pagar" ? "contas_pagar" : "contas_receber";
    const dateField = type === "pagar" ? "data_pagamento" : "data_recebimento";

    const { error } = await supabase
      .from(table)
      .update({ status: "pago", [dateField]: new Date().toISOString().split("T")[0] })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    toast.success("Marcado como pago");
    type === "pagar" ? fetchContasPagar() : fetchContasReceber();
  };

  const handleDeleteItem = async (table: "centros_custo" | "contas_pagar" | "contas_receber" | "medico_repasse_config", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Excluído com sucesso");
    fetchAllData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case "7d": return "Últimos 7 dias";
      case "30d": return "Últimos 30 dias";
      case "60d": return "Últimos 60 dias";
      case "90d": return "Últimos 90 dias";
      case "180d": return "Últimos 180 dias";
      case "365d": return "Último ano";
      default: return "Últimos 30 dias";
    }
  };

  const totalContasPagar = contasPagar.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  const totalContasReceber = contasReceber.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  const totalRepassesPendentes = repasses.filter(r => r.status === "pendente").reduce((s, r) => s + r.valor_total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" />
            Financeiro
          </h2>
          <p className="text-muted-foreground">Acompanhe seus ganhos e movimentações - {getPeriodLabel()}</p>
        </div>

        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="60d">Últimos 60 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="180d">Últimos 180 dias</SelectItem>
            <SelectItem value="365d">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4" />
            Filtros Avançados
            <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Médico</label>
                  <Select value={medicoFilter} onValueChange={setMedicoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {medicos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>Dr(a). {m.nome}</SelectItem>
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
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Local</label>
                  <Select value={localFilter} onValueChange={setLocalFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {locais.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.nome_local}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Paciente</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      value={searchPaciente}
                      onChange={(e) => setSearchPaciente(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="visao-geral" className="gap-1 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 hidden sm:block" />
            <span>Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="origem" className="gap-1 text-xs sm:text-sm">
            <Globe className="h-4 w-4 hidden sm:block" />
            <span>Origem</span>
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="gap-1 text-xs sm:text-sm">
            <ArrowLeftRight className="h-4 w-4 hidden sm:block" />
            <span>Fluxo</span>
          </TabsTrigger>
          <TabsTrigger value="repasses" className="gap-1 text-xs sm:text-sm">
            <Wallet className="h-4 w-4 hidden sm:block" />
            <span>Repasses</span>
          </TabsTrigger>
          <TabsTrigger value="contas" className="gap-1 text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 hidden sm:block" />
            <span>Contas</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1 text-xs sm:text-sm">
            <Settings className="h-4 w-4 hidden sm:block" />
            <span>Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="visao-geral" className="mt-6 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <DollarSign className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento</p>
                    <p className="text-2xl font-bold text-green-500">{formatCurrency(metrics.pago)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-yellow-500/10">
                    <Clock className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Receber</p>
                    <p className="text-2xl font-bold text-yellow-500">{formatCurrency(metrics.pendente)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <XCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Pagar</p>
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(totalContasPagar)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Consultas Pagas</p>
                    <p className="text-2xl font-bold">{metrics.pagos} / {metrics.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Faturamento por Médico</CardTitle>
              </CardHeader>
              <CardContent>
                {medicoChartData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={medicoChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80}>
                          {medicoChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {medicoChartData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm truncate flex-1">{item.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle>Consultas do Período ({filteredConsultas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredConsultas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma consulta no período</div>
                ) : (
                  <div className="overflow-x-auto max-h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Médico</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredConsultas.slice(0, 5).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{format(parseISO(c.data_hora), "dd/MM HH:mm")}</TableCell>
                            <TableCell className="truncate max-w-[100px]">{c.medico?.nome || "N/A"}</TableCell>
                            <TableCell>{formatCurrency(c.valor_consulta)}</TableCell>
                            <TableCell>
                              <Badge variant={c.status_pagamento === "pago" ? "default" : "secondary"}>
                                {c.status_pagamento === "pago" ? "Pago" : "Pendente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Origem & Canais */}
        <TabsContent value="origem" className="mt-6 space-y-6">
          {/* Filtros de Data */}
          <Card className="card-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Período:</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[150px] justify-start text-left font-normal",
                          !origemDateStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {origemDateStart ? format(origemDateStart, "dd/MM/yyyy") : "Data início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={origemDateStart}
                        onSelect={setOrigemDateStart}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-muted-foreground">até</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[150px] justify-start text-left font-normal",
                          !origemDateEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {origemDateEnd ? format(origemDateEnd, "dd/MM/yyyy") : "Data fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={origemDateEnd}
                        onSelect={setOrigemDateEnd}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOrigemDateStart(subDays(new Date(), 7));
                      setOrigemDateEnd(new Date());
                    }}
                  >
                    7 dias
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOrigemDateStart(subDays(new Date(), 30));
                      setOrigemDateEnd(new Date());
                    }}
                  >
                    30 dias
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setOrigemDateStart(subDays(new Date(), 90));
                      setOrigemDateEnd(new Date());
                    }}
                  >
                    90 dias
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas por Origem - Cards grandes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Online */}
            <Card className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Globe className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Online</h3>
                    <p className="text-sm text-muted-foreground">Agendamentos pela plataforma</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Consultas</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">
                      {originChartData.find(o => o.name === 'Online')?.value || 0}
                    </p>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {formatCurrency(originChartData.find(o => o.name === 'Online')?.receita || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Interna */}
            <Card className="bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent border-blue-500/30 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Building2 className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Interna</h3>
                    <p className="text-sm text-muted-foreground">Agendamentos diretos</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Consultas</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">
                      {originChartData.find(o => o.name === 'Interna')?.value || 0}
                    </p>
                  </div>
                  <div className="bg-background/60 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {formatCurrency(originChartData.find(o => o.name === 'Interna')?.receita || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição em Donut Chart */}
            <Card className="card-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-5 w-5 text-primary" />
                  Distribuição de Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={originChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        strokeWidth={3}
                        stroke="hsl(var(--background))"
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#3B82F6" />
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload?.[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-muted-foreground">{data.value} consultas</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-4">
                    {originChartData.map((item, index) => {
                      const total = originChartData.reduce((acc, o) => acc + o.value, 0) || 1;
                      const percent = Math.round((item.value / total) * 100);
                      const color = index === 0 ? "#10B981" : "#3B82F6";
                      return (
                        <div key={item.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="text-lg font-bold">{percent}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%`, backgroundColor: color }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{item.value} consultas</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receita por Canal - Bar Chart melhorado */}
            <Card className="card-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Receita por Canal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={originChartData} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(v) => `R$${v}`}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="receita" radius={[8, 8, 0, 0]}>
                      <Cell fill="url(#gradientOnline)" />
                      <Cell fill="url(#gradientInterna)" />
                    </Bar>
                    <defs>
                      <linearGradient id="gradientOnline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="gradientInterna" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Comparativo resumido */}
          <Card className="card-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparativo de Canais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Consultas</p>
                  <p className="text-2xl font-bold mt-1">{originChartData.reduce((acc, o) => acc + o.value, 0)}</p>
                </div>
                <div className="text-center p-4 bg-emerald-500/10 rounded-xl">
                  <p className="text-xs text-emerald-600 uppercase tracking-wide">% Online</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {originChartData.reduce((acc, o) => acc + o.value, 0) > 0 
                      ? Math.round(((originChartData.find(o => o.name === 'Online')?.value || 0) / originChartData.reduce((acc, o) => acc + o.value, 0)) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-500/10 rounded-xl">
                  <p className="text-xs text-blue-600 uppercase tracking-wide">% Interna</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {originChartData.reduce((acc, o) => acc + o.value, 0) > 0 
                      ? Math.round(((originChartData.find(o => o.name === 'Interna')?.value || 0) / originChartData.reduce((acc, o) => acc + o.value, 0)) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Receita Total</p>
                  <p className="text-xl font-bold mt-1">{formatCurrency(originChartData.reduce((acc, o) => acc + o.receita, 0))}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Fluxo de Caixa */}
        <TabsContent value="fluxo" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(metrics.pago + totalContasReceber)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-red-500">{formatCurrency(totalContasPagar)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Saldo Previsto</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency((metrics.pago + totalContasReceber) - totalContasPagar)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Fluxo de Caixa Diário</CardTitle>
            </CardHeader>
            <CardContent>
              {cashFlowData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="entradas" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Entradas" />
                    <Area type="monotone" dataKey="saidas" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Saídas" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Repasses */}
        <TabsContent value="repasses" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Próximo Repasse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-500">{formatCurrency(totalRepassesPendentes)}</p>
                <Badge className="mt-2 bg-yellow-500">Pendente</Badge>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Total Repassado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">
                  {formatCurrency(repasses.filter(r => r.status === "pago").reduce((s, r) => s + r.valor_total, 0))}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {repasses.filter(r => r.status === "pago").length} repasses realizados
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Repasses por Médico</CardTitle>
              <CardDescription>Valores pendentes de repasse por consulta</CardDescription>
            </CardHeader>
            <CardContent>
              {repassesPorMedico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum repasse pendente</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">Valor Pendente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repassesPorMedico.map((item) => (
                      <TableRow key={item.nome}>
                        <TableCell className="font-medium">Dr(a). {item.nome}</TableCell>
                        <TableCell className="text-right text-yellow-600 font-bold">{formatCurrency(item.pendente)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle>Histórico de Repasses</CardTitle>
            </CardHeader>
            <CardContent>
              {repasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum repasse registrado</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repasses.slice(0, 10).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>Dr(a). {r.medico?.nome || "N/A"}</TableCell>
                        <TableCell>{format(parseISO(r.periodo_inicio), "dd/MM")} - {format(parseISO(r.periodo_fim), "dd/MM/yy")}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(r.valor_total)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "pago" ? "default" : "secondary"}>
                            {r.status === "pago" ? "Pago" : "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Contas a Pagar/Receber */}
        <TabsContent value="contas" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contas a Pagar */}
            <Card className="card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <CreditCard className="h-5 w-5" />
                    Contas a Pagar
                  </CardTitle>
                  <CardDescription>Total pendente: {formatCurrency(totalContasPagar)}</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingItem(null); setFormContaPagar({ descricao: "", valor: "", data_vencimento: "", fornecedor: "", centro_custo_id: "", observacoes: "" }); setShowContaPagarModal(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nova
                </Button>
              </CardHeader>
              <CardContent>
                {contasPagar.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma conta cadastrada</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {contasPagar.map((conta) => (
                      <div key={conta.id} className={`p-3 rounded-lg border ${conta.status === "pago" ? "bg-green-50 border-green-200" : "bg-card"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{conta.descricao}</p>
                            <p className="text-sm text-muted-foreground">{conta.fornecedor || "Sem fornecedor"}</p>
                            {conta.centro_custo && <Badge variant="outline" className="text-xs mt-1">{conta.centro_custo.nome}</Badge>}
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-500">{formatCurrency(Number(conta.valor))}</p>
                            <p className="text-xs text-muted-foreground">Venc: {format(parseISO(conta.data_vencimento), "dd/MM/yy")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {conta.status !== "pago" && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid("pagar", conta.id)}>
                              Marcar Pago
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteItem("contas_pagar", conta.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contas a Receber */}
            <Card className="card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <DollarSign className="h-5 w-5" />
                    Contas a Receber
                  </CardTitle>
                  <CardDescription>Total pendente: {formatCurrency(totalContasReceber)}</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingItem(null); setFormContaReceber({ descricao: "", valor: "", data_vencimento: "", cliente: "", observacoes: "" }); setShowContaReceberModal(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Nova
                </Button>
              </CardHeader>
              <CardContent>
                {contasReceber.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma conta cadastrada</div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {contasReceber.map((conta) => (
                      <div key={conta.id} className={`p-3 rounded-lg border ${conta.status === "pago" ? "bg-green-50 border-green-200" : "bg-card"}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{conta.descricao}</p>
                            <p className="text-sm text-muted-foreground">{conta.cliente || "Sem cliente"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-500">{formatCurrency(Number(conta.valor))}</p>
                            <p className="text-xs text-muted-foreground">Venc: {format(parseISO(conta.data_vencimento), "dd/MM/yy")}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {conta.status !== "pago" && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid("receber", conta.id)}>
                              Marcar Recebido
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteItem("contas_receber", conta.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="config" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Centros de Custo */}
            <Card className="card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Centros de Custo
                  </CardTitle>
                  <CardDescription>Categorize suas despesas</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingItem(null); setFormCentroCusto({ nome: "", descricao: "" }); setShowCentroCustoModal(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              </CardHeader>
              <CardContent>
                {centrosCusto.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum centro de custo</div>
                ) : (
                  <div className="space-y-2">
                    {centrosCusto.map((cc) => (
                      <div key={cc.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{cc.nome}</p>
                          {cc.descricao && <p className="text-sm text-muted-foreground">{cc.descricao}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingItem(cc);
                            setFormCentroCusto({ nome: cc.nome, descricao: cc.descricao || "" });
                            setShowCentroCustoModal(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteItem("centros_custo", cc.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuração de Repasse por Médico */}
            <Card className="card-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Repasse por Médico
                  </CardTitle>
                  <CardDescription>Configure % ou valor fixo por consulta</CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditingItem(null); setFormRepasseConfig({ medico_id: "", tipo_repasse: "percentual", percentual_repasse: "70", valor_fixo_repasse: "" }); setShowRepasseConfigModal(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Novo
                </Button>
              </CardHeader>
              <CardContent>
                {medicoRepasseConfigs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhuma configuração</div>
                ) : (
                  <div className="space-y-2">
                    {medicoRepasseConfigs.map((config) => (
                      <div key={config.id} className="flex justify-between items-center p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">Dr(a). {config.medico?.nome || "N/A"}</p>
                          <p className="text-sm text-muted-foreground">
                            {config.tipo_repasse === "percentual" 
                              ? `${config.percentual_repasse}% do valor da consulta`
                              : `R$ ${config.valor_fixo_repasse} por consulta`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingItem(config);
                            setFormRepasseConfig({
                              medico_id: config.medico_id,
                              tipo_repasse: config.tipo_repasse,
                              percentual_repasse: String(config.percentual_repasse),
                              valor_fixo_repasse: config.valor_fixo_repasse ? String(config.valor_fixo_repasse) : "",
                            });
                            setShowRepasseConfigModal(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteItem("medico_repasse_config", config.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {/* Centro de Custo Modal */}
      <Dialog open={showCentroCustoModal} onOpenChange={setShowCentroCustoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Novo"} Centro de Custo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formCentroCusto.nome} onChange={(e) => setFormCentroCusto({ ...formCentroCusto, nome: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formCentroCusto.descricao} onChange={(e) => setFormCentroCusto({ ...formCentroCusto, descricao: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCentroCustoModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveCentroCusto}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta a Pagar Modal */}
      <Dialog open={showContaPagarModal} onOpenChange={setShowContaPagarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Nova"} Conta a Pagar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={formContaPagar.descricao} onChange={(e) => setFormContaPagar({ ...formContaPagar, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={formContaPagar.valor} onChange={(e) => setFormContaPagar({ ...formContaPagar, valor: e.target.value })} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={formContaPagar.data_vencimento} onChange={(e) => setFormContaPagar({ ...formContaPagar, data_vencimento: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={formContaPagar.fornecedor} onChange={(e) => setFormContaPagar({ ...formContaPagar, fornecedor: e.target.value })} />
            </div>
            <div>
              <Label>Centro de Custo</Label>
              <Select value={formContaPagar.centro_custo_id || ""} onValueChange={(v) => setFormContaPagar({ ...formContaPagar, centro_custo_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {centrosCusto.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContaPagarModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveContaPagar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta a Receber Modal */}
      <Dialog open={showContaReceberModal} onOpenChange={setShowContaReceberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Nova"} Conta a Receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={formContaReceber.descricao} onChange={(e) => setFormContaReceber({ ...formContaReceber, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={formContaReceber.valor} onChange={(e) => setFormContaReceber({ ...formContaReceber, valor: e.target.value })} />
              </div>
              <div>
                <Label>Vencimento *</Label>
                <Input type="date" value={formContaReceber.data_vencimento} onChange={(e) => setFormContaReceber({ ...formContaReceber, data_vencimento: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Cliente</Label>
              <Input value={formContaReceber.cliente} onChange={(e) => setFormContaReceber({ ...formContaReceber, cliente: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContaReceberModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveContaReceber}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repasse Config Modal */}
      <Dialog open={showRepasseConfigModal} onOpenChange={setShowRepasseConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Nova"} Configuração de Repasse</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Médico *</Label>
              <Select value={formRepasseConfig.medico_id} onValueChange={(v) => setFormRepasseConfig({ ...formRepasseConfig, medico_id: v })} disabled={!!editingItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {medicos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>Dr(a). {m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Repasse</Label>
              <Select value={formRepasseConfig.tipo_repasse} onValueChange={(v) => setFormRepasseConfig({ ...formRepasseConfig, tipo_repasse: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formRepasseConfig.tipo_repasse === "percentual" ? (
              <div>
                <Label>Percentual de Repasse (%)</Label>
                <Input type="number" step="0.01" value={formRepasseConfig.percentual_repasse} onChange={(e) => setFormRepasseConfig({ ...formRepasseConfig, percentual_repasse: e.target.value })} />
              </div>
            ) : (
              <div>
                <Label>Valor Fixo por Consulta (R$)</Label>
                <Input type="number" step="0.01" value={formRepasseConfig.valor_fixo_repasse} onChange={(e) => setFormRepasseConfig({ ...formRepasseConfig, valor_fixo_repasse: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepasseConfigModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveRepasseConfig}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

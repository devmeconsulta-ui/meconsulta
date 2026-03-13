import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format, subDays, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar as CalendarIcon,
  Filter,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  Users,
  Stethoscope,
  Clock,
  XCircle,
  CheckCircle,
  BarChart3,
  PieChart as PieChartIcon,
  X,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

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
  clinica_id: string | null;
  tipo_atendimento: string | null;
  convenio_id: string | null;
  formas_pagamento: any;
  paciente: { nome: string; cpf?: string } | null;
  medico: { nome: string; especialidade: string; crm?: string } | null;
  local: { nome_local: string; cidade?: string; estado?: string } | null;
  convenio: { nome: string } | null;
  nome_paciente_consulta: string | null;
  created_at: string;
  // Enriched fields
  procedimentos?: { nome_procedimento: string; valor: number }[];
  totalProcedimentos?: number;
  valorClinica?: number;
  repasseConsultaConfig?: { tipo: string; percentual: number; fixo: number | null };
  repasseProcedimentoConfigs?: { nome: string; tipo: string; percentual: number; fixo: number | null }[];
}

interface RepasseConfig {
  id: string;
  medico_id: string;
  tipo_repasse: string;
  percentual_repasse: number;
  valor_fixo_repasse: number | null;
}

interface ProcRepasseConfig {
  id: string;
  medico_id: string;
  nome_procedimento: string;
  tipo_repasse: string;
  percentual_repasse: number;
  valor_fixo_repasse: number | null;
}

type PeriodFilter = "7d" | "30d" | "60d" | "90d" | "180d" | "365d" | "mes_atual" | "mes_anterior" | "personalizado";

const COLORS = ["#0066CC", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function ClinicaRelatorios() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [tipoRelatorio, setTipoRelatorio] = useState("geral");
  const [agrupamento, setAgrupamento] = useState("dia");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Advanced filters
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const [localFilter, setLocalFilter] = useState("todos");
  const [tipoAtendimentoFilter, setTipoAtendimentoFilter] = useState("todos");
  const [convenioFilter, setConvenioFilter] = useState("todos");

  // Custom date range
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const calculatedDateRange = useMemo(() => {
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
      case "mes_atual":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes_anterior": {
        const lastMonth = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case "personalizado":
        return {
          start: dateRange.from || subDays(now, 30),
          end: dateRange.to || now,
        };
      default:
        return { start: subDays(now, 30), end: future };
    }
  }, [periodFilter, dateRange]);

  // Fetch médicos vinculados
  const { data: medicos } = useQuery({
    queryKey: ["clinica-medicos-relatorios", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("clinicas_medicos")
        .select("medico_id, medicos(id, nome, especialidade)")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);
      return data?.map((v: any) => v.medicos).filter(Boolean) || [];
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch locais
  const { data: locais } = useQuery({
    queryKey: ["clinica-locais-relatorios", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("locais_atendimento")
        .select("id, nome_local, cidade, estado")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch convênios
  const { data: convenios } = useQuery({
    queryKey: ["clinica-convenios-relatorios", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("convenios")
        .select("id, nome")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch repasse configs
  const { data: repasseConfigs } = useQuery({
    queryKey: ["clinica-repasse-configs", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("medico_repasse_config")
        .select("*")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);
      return (data || []) as RepasseConfig[];
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch procedure repasse configs
  const { data: procRepasseConfigs } = useQuery({
    queryKey: ["clinica-proc-repasse-configs", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];
      const { data } = await supabase
        .from("procedimento_repasse_config")
        .select("*")
        .eq("clinica_id", clinicaData.id);
      return (data || []) as ProcRepasseConfig[];
    },
    enabled: !!clinicaData?.id,
  });

  // Fetch consultas
  const { data: consultas, isLoading } = useQuery({
    queryKey: ["clinica-consultas-relatorios", clinicaData?.id, calculatedDateRange, repasseConfigs, procRepasseConfigs],
    queryFn: async () => {
      if (!clinicaData?.id || !medicos?.length) return [];
      const medicoIds = medicos.map((m: any) => m.id);

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
          clinica_id,
          tipo_atendimento,
          convenio_id,
          formas_pagamento,
          nome_paciente_consulta,
          created_at,
          paciente:pacientes!consultas_paciente_id_fkey(nome, cpf),
          medico:medicos!consultas_medico_id_fkey(nome, especialidade, crm),
          local:locais_atendimento!consultas_local_id_fkey(nome_local, cidade, estado),
          convenio:convenios!consultas_convenio_id_fkey(nome)
        `)
        .eq("clinica_id", clinicaData.id)
        .in("medico_id", medicoIds)
        .gte("data_hora", calculatedDateRange.start.toISOString())
        .lte("data_hora", calculatedDateRange.end.toISOString())
        .order("data_hora", { ascending: false });

      if (error) throw error;

      const consultaIds = (data || []).map((c: any) => c.id);
      
      // Fetch procedures for all consultations
      let procedimentosMap: Record<string, { nome_procedimento: string; valor: number }[]> = {};
      if (consultaIds.length > 0) {
        const { data: procs } = await supabase
          .from("consulta_procedimentos")
          .select("consulta_id, nome_procedimento, valor")
          .in("consulta_id", consultaIds);
        (procs || []).forEach((p: any) => {
          if (!procedimentosMap[p.consulta_id]) procedimentosMap[p.consulta_id] = [];
          procedimentosMap[p.consulta_id].push({ nome_procedimento: p.nome_procedimento, valor: Number(p.valor) });
        });
      }

      // Enrich consultations
      return (data || []).map((c: any) => {
        const procs = procedimentosMap[c.id] || [];
        const totalProcedimentos = procs.reduce((sum: number, p: any) => sum + p.valor, 0);
        const valorClinica = Number(c.valor_consulta) - Number(c.valor_medico);

        // Repasse config for this doctor
        const rc = (repasseConfigs || []).find((r) => r.medico_id === c.medico_id);
        const repasseConsultaConfig = rc
          ? { tipo: rc.tipo_repasse, percentual: Number(rc.percentual_repasse), fixo: rc.valor_fixo_repasse ? Number(rc.valor_fixo_repasse) : null }
          : { tipo: "percentual", percentual: 70, fixo: null };

        // Procedure repasse configs for this doctor
        const prcList = (procRepasseConfigs || []).filter((p) => p.medico_id === c.medico_id);
        const repasseProcedimentoConfigs = prcList.map((p) => ({
          nome: p.nome_procedimento,
          tipo: p.tipo_repasse,
          percentual: Number(p.percentual_repasse),
          fixo: p.valor_fixo_repasse ? Number(p.valor_fixo_repasse) : null,
        }));

        return {
          ...c,
          procedimentos: procs,
          totalProcedimentos,
          valorClinica,
          repasseConsultaConfig,
          repasseProcedimentoConfigs,
        } as Consulta;
      });
    },
    enabled: !!clinicaData?.id && !!medicos?.length,
  });

  // Apply filters
  const filteredConsultas = useMemo(() => {
    let filtered = consultas || [];

    if (medicoFilter !== "todos") {
      filtered = filtered.filter((c) => c.medico_id === medicoFilter);
    }

    if (statusFilter !== "todos") {
      if (statusFilter === "pago") {
        filtered = filtered.filter((c) => c.status_pagamento === "pago");
      } else if (statusFilter === "pendente") {
        filtered = filtered.filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada");
      } else if (statusFilter === "cancelado") {
        filtered = filtered.filter((c) => c.status_consulta === "cancelada");
      }
    }

    if (origemFilter !== "todos") {
      filtered = filtered.filter((c) => c.origem === origemFilter);
    }

    if (localFilter !== "todos") {
      filtered = filtered.filter((c) => c.local_id === localFilter);
    }

    if (tipoAtendimentoFilter !== "todos") {
      filtered = filtered.filter((c) => c.tipo_atendimento === tipoAtendimentoFilter);
    }

    if (convenioFilter !== "todos") {
      filtered = filtered.filter((c) => c.convenio_id === convenioFilter);
    }

    return filtered;
  }, [consultas, medicoFilter, statusFilter, origemFilter, localFilter, tipoAtendimentoFilter, convenioFilter]);

  // Only online consultations for revenue
  const consultasOnline = useMemo(
    () => filteredConsultas.filter((c) => c.origem === "online"),
    [filteredConsultas]
  );

  // Metrics
  const metrics = useMemo(() => {
    const all = filteredConsultas;
    const online = consultasOnline;

    const totalValorMedico = all.reduce((sum, c) => sum + Number(c.valor_medico), 0);
    const totalValorClinica = all.reduce((sum, c) => sum + (c.valorClinica || 0), 0);
    const totalProcedimentos = all.reduce((sum, c) => sum + (c.totalProcedimentos || 0), 0);
    const consultasComProc = all.filter((c) => (c.totalProcedimentos || 0) > 0).length;

    return {
      totalConsultas: all.length,
      consultasOnline: online.length,
      consultasInternas: all.filter((c) => c.origem === "interna").length,
      consultasPagas: online.filter((c) => c.status_pagamento === "pago").length,
      consultasPendentes: online.filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada").length,
      consultasCanceladas: all.filter((c) => c.status_consulta === "cancelada").length,
      receitaTotal: online.reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      receitaPaga: online.filter((c) => c.status_pagamento === "pago").reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      receitaPendente: online.filter((c) => c.status_pagamento === "pendente" && c.status_consulta !== "cancelada").reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      ticketMedio: online.length > 0 ? online.reduce((sum, c) => sum + Number(c.valor_consulta), 0) / online.length : 0,
      totalValorMedico,
      totalValorClinica,
      totalProcedimentos,
      consultasComProc,
    };
  }, [filteredConsultas, consultasOnline]);

  // Data by period
  const dadosPorPeriodo = useMemo(() => {
    if (!consultasOnline.length) return [];

    const grouped: Record<string, { receita: number; consultas: number; pago: number; pendente: number }> = {};

    consultasOnline.forEach((c) => {
      let key = "";
      const date = new Date(c.data_hora);

      if (agrupamento === "dia") {
        key = format(date, "dd/MM");
      } else if (agrupamento === "semana") {
        key = `Sem ${format(date, "w")}`;
      } else {
        key = format(date, "MMM/yy", { locale: ptBR });
      }

      if (!grouped[key]) {
        grouped[key] = { receita: 0, consultas: 0, pago: 0, pendente: 0 };
      }
      grouped[key].receita += Number(c.valor_consulta);
      grouped[key].consultas += 1;
      if (c.status_pagamento === "pago") {
        grouped[key].pago += Number(c.valor_consulta);
      } else if (c.status_pagamento === "pendente") {
        grouped[key].pendente += Number(c.valor_consulta);
      }
    });

    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .slice(-15);
  }, [consultasOnline, agrupamento]);

  // Data by doctor
  const dadosPorMedico = useMemo(() => {
    if (!consultasOnline.length) return [];

    const grouped: Record<string, { nome: string; especialidade: string; receita: number; consultas: number; pago: number }> = {};

    consultasOnline.forEach((c: any) => {
      const id = c.medico_id || "unknown";
      if (!grouped[id]) {
        grouped[id] = {
          nome: c.medico?.nome || "Desconhecido",
          especialidade: c.medico?.especialidade || "",
          receita: 0,
          consultas: 0,
          pago: 0,
        };
      }
      grouped[id].receita += Number(c.valor_consulta);
      grouped[id].consultas += 1;
      if (c.status_pagamento === "pago") {
        grouped[id].pago += Number(c.valor_consulta);
      }
    });

    return Object.values(grouped).sort((a, b) => b.receita - a.receita);
  }, [consultasOnline]);

  // Data by local
  const dadosPorLocal = useMemo(() => {
    if (!filteredConsultas.length) return [];

    const grouped: Record<string, { nome: string; receita: number; consultas: number }> = {};

    filteredConsultas.forEach((c: any) => {
      const nome = c.local?.nome_local || "Sem local";
      if (!grouped[nome]) {
        grouped[nome] = { nome, receita: 0, consultas: 0 };
      }
      grouped[nome].consultas += 1;
      if (c.origem === "online") {
        grouped[nome].receita += Number(c.valor_consulta);
      }
    });

    return Object.values(grouped).sort((a, b) => b.consultas - a.consultas);
  }, [filteredConsultas]);

  // Data by convênio
  const dadosPorConvenio = useMemo(() => {
    if (!filteredConsultas.length) return [];

    const grouped: Record<string, { nome: string; consultas: number; valor: number; pago: number }> = {};

    // Group by tipo_atendimento first
    const particular = filteredConsultas.filter((c) => c.tipo_atendimento === "particular" || !c.tipo_atendimento);
    const convenioConsultas = filteredConsultas.filter((c) => c.tipo_atendimento === "convenio");

    if (particular.length > 0) {
      grouped["particular"] = {
        nome: "Particular",
        consultas: particular.length,
        valor: particular.reduce((sum, c) => sum + Number(c.valor_consulta), 0),
        pago: particular.filter((c) => c.status_pagamento === "pago").reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      };
    }

    convenioConsultas.forEach((c: any) => {
      const id = c.convenio_id || "sem_convenio";
      const nome = c.convenio?.nome || "Convênio não especificado";
      if (!grouped[id]) {
        grouped[id] = { nome, consultas: 0, valor: 0, pago: 0 };
      }
      grouped[id].consultas += 1;
      grouped[id].valor += Number(c.valor_consulta);
      if (c.status_pagamento === "pago") {
        grouped[id].pago += Number(c.valor_consulta);
      }
    });

    return Object.values(grouped).sort((a, b) => b.consultas - a.consultas);
  }, [filteredConsultas]);

  // Metrics by tipo atendimento
  const metricasConvenio = useMemo(() => {
    const particular = filteredConsultas.filter((c) => c.tipo_atendimento === "particular" || !c.tipo_atendimento);
    const convenioConsultas = filteredConsultas.filter((c) => c.tipo_atendimento === "convenio");
    
    return {
      totalParticular: particular.length,
      valorParticular: particular.reduce((sum, c) => sum + Number(c.valor_consulta), 0),
      totalConvenio: convenioConsultas.length,
      valorConvenio: convenioConsultas.reduce((sum, c) => sum + Number(c.valor_consulta), 0),
    };
  }, [filteredConsultas]);

  // Data by status
  const dadosPorStatus = useMemo(() => {
    return [
      { name: "Pago", value: metrics.consultasPagas, color: "#10B981" },
      { name: "Pendente", value: metrics.consultasPendentes, color: "#F59E0B" },
      { name: "Cancelado", value: metrics.consultasCanceladas, color: "#EF4444" },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPatientName = (consulta: Consulta) => {
    return consulta.nome_paciente_consulta || consulta.paciente?.nome || "Não informado";
  };

  const clearFilters = () => {
    setMedicoFilter("todos");
    setStatusFilter("todos");
    setOrigemFilter("todos");
    setLocalFilter("todos");
    setTipoAtendimentoFilter("todos");
    setConvenioFilter("todos");
  };

  const activeFiltersCount = [
    medicoFilter !== "todos",
    statusFilter !== "todos",
    origemFilter !== "todos",
    localFilter !== "todos",
    tipoAtendimentoFilter !== "todos",
    convenioFilter !== "todos",
  ].filter(Boolean).length;

  // Export to Excel
  const exportToExcel = () => {
    if (!filteredConsultas.length) {
      toast.error("Não há dados para exportar");
      return;
    }

    try {
      // Prepare data
      const data = filteredConsultas.map((c) => {
        const repasseConsultaLabel = c.repasseConsultaConfig
          ? c.repasseConsultaConfig.tipo === "fixo"
            ? `Fixo ${formatCurrency(c.repasseConsultaConfig.fixo || 0)}`
            : `${c.repasseConsultaConfig.percentual}%`
          : "70%";

        const procNames = (c.procedimentos || []).map((p) => p.nome_procedimento).join(", ");
        const procRepasseLabel = (c.repasseProcedimentoConfigs || [])
          .map((p) => `${p.nome}: ${p.tipo === "fixo" ? formatCurrency(p.fixo || 0) : `${p.percentual}%`}`)
          .join("; ") || "—";

        return {
          "Data/Hora": format(parseISO(c.data_hora), "dd/MM/yyyy HH:mm"),
          "Médico": c.medico?.nome || "N/A",
          "Especialidade": c.medico?.especialidade || "N/A",
          "CRM": c.medico?.crm || "N/A",
          "Paciente": getPatientName(c),
          "CPF Paciente": c.paciente?.cpf || "N/A",
          "Local": c.local?.nome_local || "N/A",
          "Cidade": c.local?.cidade || "N/A",
          "Estado": c.local?.estado || "N/A",
          "Origem": c.origem === "online" ? "Online" : "Interna",
          "Forma Pagamento": c.formas_pagamento ? (Array.isArray(c.formas_pagamento) ? c.formas_pagamento.map((f: any) => f.forma || f).join(", ") : String(c.formas_pagamento)) : "—",
          "Status Consulta": c.status_consulta,
          "Status Pagamento": c.status_pagamento,
          "Valor Total": Number(c.valor_consulta),
          "Valor Médico": Number(c.valor_medico),
          "Valor Clínica": c.valorClinica || 0,
          "Valor Plataforma": Number(c.valor_plataforma),
          "Procedimentos": procNames || "—",
          "Valor Procedimentos": c.totalProcedimentos || 0,
          "Repasse Consulta": repasseConsultaLabel,
          "Repasse Procedimentos": procRepasseLabel,
          "Data Criação": format(parseISO(c.created_at), "dd/MM/yyyy HH:mm"),
        };
      });

      // Create summary sheet
      const resumo = [
        { "Métrica": "Total de Consultas", "Valor": metrics.totalConsultas },
        { "Métrica": "Consultas Online", "Valor": metrics.consultasOnline },
        { "Métrica": "Consultas Internas", "Valor": metrics.consultasInternas },
        { "Métrica": "Consultas Pagas", "Valor": metrics.consultasPagas },
        { "Métrica": "Consultas Pendentes", "Valor": metrics.consultasPendentes },
        { "Métrica": "Consultas Canceladas", "Valor": metrics.consultasCanceladas },
        { "Métrica": "Receita Total (Online)", "Valor": formatCurrency(metrics.receitaTotal) },
        { "Métrica": "Receita Paga", "Valor": formatCurrency(metrics.receitaPaga) },
        { "Métrica": "Receita Pendente", "Valor": formatCurrency(metrics.receitaPendente) },
        { "Métrica": "Ticket Médio", "Valor": formatCurrency(metrics.ticketMedio) },
        { "Métrica": "Total Valor Médicos", "Valor": formatCurrency(metrics.totalValorMedico) },
        { "Métrica": "Total Valor Clínica", "Valor": formatCurrency(metrics.totalValorClinica) },
        { "Métrica": "Total Procedimentos", "Valor": formatCurrency(metrics.totalProcedimentos) },
        { "Métrica": "Consultas com Procedimentos", "Valor": metrics.consultasComProc },
      ];

      // Create by doctor sheet
      const porMedico = dadosPorMedico.map((d) => ({
        "Médico": d.nome,
        "Especialidade": d.especialidade,
        "Consultas": d.consultas,
        "Receita Total": formatCurrency(d.receita),
        "Receita Paga": formatCurrency(d.pago),
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.json_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

      const ws2 = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws2, "Consultas");

      const ws3 = XLSX.utils.json_to_sheet(porMedico);
      XLSX.utils.book_append_sheet(wb, ws3, "Por Médico");

      // Generate filename
      const filename = `relatorio_financeiro_${clinicaData?.nome_fantasia || "clinica"}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success("Relatório Excel gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao gerar relatório Excel");
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!filteredConsultas.length) {
      toast.error("Não há dados para exportar");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório Financeiro", pageWidth / 2, yPos, { align: "center" });
      yPos += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(clinicaData?.nome_fantasia || "Clínica", pageWidth / 2, yPos, { align: "center" });
      yPos += 6;

      doc.setFontSize(10);
      doc.text(`Período: ${format(calculatedDateRange.start, "dd/MM/yyyy")} a ${format(calculatedDateRange.end, "dd/MM/yyyy")}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Summary section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo Geral", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const summaryData = [
        ["Total de Consultas:", metrics.totalConsultas.toString()],
        ["Consultas Online:", metrics.consultasOnline.toString()],
        ["Consultas Internas:", metrics.consultasInternas.toString()],
        ["Consultas Pagas:", metrics.consultasPagas.toString()],
        ["Consultas Pendentes:", metrics.consultasPendentes.toString()],
        ["Consultas Canceladas:", metrics.consultasCanceladas.toString()],
        ["Receita Total (Online):", formatCurrency(metrics.receitaTotal)],
        ["Receita Paga:", formatCurrency(metrics.receitaPaga)],
        ["Receita Pendente:", formatCurrency(metrics.receitaPendente)],
        ["Ticket Médio:", formatCurrency(metrics.ticketMedio)],
        ["Total Valor Médicos:", formatCurrency(metrics.totalValorMedico)],
        ["Total Valor Clínica:", formatCurrency(metrics.totalValorClinica)],
        ["Total Procedimentos:", formatCurrency(metrics.totalProcedimentos)],
        ["Consultas c/ Procedimentos:", metrics.consultasComProc.toString()],
      ];

      summaryData.forEach(([label, value]) => {
        doc.text(label, 14, yPos);
        doc.text(value, 80, yPos);
        yPos += 6;
      });

      yPos += 10;

      // By Doctor section
      if (dadosPorMedico.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Faturamento por Médico", 14, yPos);
        yPos += 10;

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Médico", 14, yPos);
        doc.text("Especialidade", 70, yPos);
        doc.text("Consultas", 120, yPos);
        doc.text("Receita", 150, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        dadosPorMedico.slice(0, 10).forEach((d) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(d.nome.substring(0, 30), 14, yPos);
          doc.text((d.especialidade || "-").substring(0, 25), 70, yPos);
          doc.text(d.consultas.toString(), 120, yPos);
          doc.text(formatCurrency(d.receita), 150, yPos);
          yPos += 6;
        });
      }

      yPos += 10;

      // Recent consultations
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Últimas Consultas", 14, yPos);
      yPos += 10;

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Data", 14, yPos);
      doc.text("Médico", 36, yPos);
      doc.text("Paciente", 68, yPos);
      doc.text("V.Total", 100, yPos);
      doc.text("V.Médico", 122, yPos);
      doc.text("V.Clínica", 144, yPos);
      doc.text("Proced.", 166, yPos);
      doc.text("Status", 186, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      filteredConsultas.slice(0, 30).forEach((c) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(format(parseISO(c.data_hora), "dd/MM/yy HH:mm"), 14, yPos);
        doc.text((c.medico?.nome || "N/A").substring(0, 16), 36, yPos);
        doc.text(getPatientName(c).substring(0, 16), 68, yPos);
        doc.text(formatCurrency(c.valor_consulta), 100, yPos);
        doc.text(formatCurrency(c.valor_medico), 122, yPos);
        doc.text(formatCurrency(c.valorClinica || 0), 144, yPos);
        doc.text(c.totalProcedimentos ? formatCurrency(c.totalProcedimentos) : "—", 166, yPos);
        doc.text(c.status_pagamento === "pago" ? "Pago" : c.status_consulta === "cancelada" ? "Canc." : "Pend.", 186, yPos);
        yPos += 4;

        // Print procedures details if any
        if (c.procedimentos && c.procedimentos.length > 0) {
          doc.setFontSize(6);
          c.procedimentos.forEach((p) => {
            if (yPos > 280) { doc.addPage(); yPos = 20; }
            const procRepasse = (c.repasseProcedimentoConfigs || []).find((r) => r.nome === p.nome_procedimento);
            const repasseInfo = procRepasse ? (procRepasse.tipo === "fixo" ? `Fixo ${formatCurrency(procRepasse.fixo || 0)}` : `${procRepasse.percentual}%`) : "—";
            doc.text(`  → ${p.nome_procedimento}: ${formatCurrency(p.valor)} (Repasse: ${repasseInfo})`, 36, yPos);
            yPos += 3.5;
          });
          doc.setFontSize(7);
        }

        // Print repasse info
        if (c.repasseConsultaConfig) {
          doc.setFontSize(6);
          if (yPos > 280) { doc.addPage(); yPos = 20; }
          const rcLabel = c.repasseConsultaConfig.tipo === "fixo" ? `Fixo ${formatCurrency(c.repasseConsultaConfig.fixo || 0)}` : `${c.repasseConsultaConfig.percentual}%`;
          doc.text(`  Repasse consulta: ${rcLabel}`, 36, yPos);
          yPos += 4;
          doc.setFontSize(7);
        }
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: "center" });
      }

      const filename = `relatorio_financeiro_${clinicaData?.nome_fantasia || "clinica"}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
      doc.save(filename);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === "consultas" ? entry.value : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatórios Financeiros</h2>
          <p className="text-muted-foreground">Gere relatórios detalhados em Excel e PDF</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={exportToExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="default" className="gap-2" onClick={exportToPDF}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
          <SelectTrigger className="w-[180px]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="60d">Últimos 60 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="180d">Últimos 6 meses</SelectItem>
            <SelectItem value="365d">Último ano</SelectItem>
            <SelectItem value="mes_atual">Mês Atual</SelectItem>
            <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {periodFilter === "personalizado" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  "Selecionar período"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: any) => setDateRange(range)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        )}

        <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
          <SelectTrigger className="w-[180px]">
            <BarChart3 className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="geral">Visão Geral</SelectItem>
            <SelectItem value="medicos">Por Médico</SelectItem>
            <SelectItem value="locais">Por Local</SelectItem>
            <SelectItem value="convenios">Por Convênio</SelectItem>
          </SelectContent>
        </Select>

        <Select value={agrupamento} onValueChange={setAgrupamento}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dia">Por Dia</SelectItem>
            <SelectItem value="semana">Por Semana</SelectItem>
            <SelectItem value="mes">Por Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="gap-2 p-0 h-auto font-semibold">
                  <Filter className="h-5 w-5" />
                  Filtros Avançados
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              {activeFiltersCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Médico
                  </Label>
                  <Select value={medicoFilter} onValueChange={setMedicoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os médicos</SelectItem>
                      {medicos?.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          Dr(a). {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Status Pagamento
                  </Label>
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
                  <Label>Origem</Label>
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
                  <Label>Local</Label>
                  <Select value={localFilter} onValueChange={setLocalFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {locais?.map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.nome_local}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo Atendimento</Label>
                  <Select value={tipoAtendimentoFilter} onValueChange={setTipoAtendimentoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                      <SelectItem value="convenio">Convênio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Convênio</Label>
                  <Select value={convenioFilter} onValueChange={setConvenioFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {convenios?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Receita Paga</p>
                <p className="text-xl font-bold text-primary truncate">{formatCurrency(metrics.receitaPaga)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-muted shrink-0">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Receita Pendente</p>
                <p className="text-xl font-bold truncate">{formatCurrency(metrics.receitaPendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                <Stethoscope className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Valor Médicos</p>
                <p className="text-xl font-bold truncate">{formatCurrency(metrics.totalValorMedico)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent shrink-0">
                <Building2 className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Valor Clínica</p>
                <p className="text-xl font-bold truncate">{formatCurrency(metrics.totalValorClinica)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Consultas</p>
                <p className="text-xl font-bold truncate">{metrics.totalConsultas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Total Consultas</p>
                <p className="text-xl font-bold truncate">{metrics.totalConsultas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold truncate">{formatCurrency(metrics.ticketMedio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Period */}
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Período</CardTitle>
            <CardDescription>Receita paga e pendente</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosPorPeriodo.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dadosPorPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="pago" name="Pago" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="pendente" name="Pendente" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Consultas online por status de pagamento</CardDescription>
          </CardHeader>
          <CardContent>
            {dadosPorStatus.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado disponível
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={dadosPorStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                    >
                      {dadosPorStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {dadosPorStatus.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm flex-1">{item.name}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conditional content based on report type */}
      {tipoRelatorio === "medicos" && (
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por Médico</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosPorMedico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead className="text-center">Consultas</TableHead>
                      <TableHead className="text-right">Receita Total</TableHead>
                      <TableHead className="text-right">Receita Paga</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPorMedico.map((d) => (
                      <TableRow key={d.nome}>
                        <TableCell className="font-medium">Dr(a). {d.nome}</TableCell>
                        <TableCell>{d.especialidade || "-"}</TableCell>
                        <TableCell className="text-center">{d.consultas}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(d.pago)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tipoRelatorio === "locais" && (
        <Card>
          <CardHeader>
            <CardTitle>Consultas por Local</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosPorLocal.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-center">Consultas</TableHead>
                      <TableHead className="text-right">Receita (Online)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dadosPorLocal.map((d) => (
                      <TableRow key={d.nome}>
                        <TableCell className="font-medium">{d.nome}</TableCell>
                        <TableCell className="text-center">{d.consultas}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.receita)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tipoRelatorio === "convenios" && (
        <>
          {/* Metrics cards for convenio */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 shrink-0">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Particular</p>
                    <p className="text-xl font-bold truncate">{metricasConvenio.totalParticular} consultas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 shrink-0">
                    <DollarSign className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Valor Particular</p>
                    <p className="text-xl font-bold truncate">{formatCurrency(metricasConvenio.valorParticular)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 shrink-0">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Convênio</p>
                    <p className="text-xl font-bold truncate">{metricasConvenio.totalConvenio} consultas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 shrink-0">
                    <DollarSign className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Valor Convênio</p>
                    <p className="text-xl font-bold truncate">{formatCurrency(metricasConvenio.valorConvenio)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Consultas por Tipo de Atendimento / Convênio</CardTitle>
              <CardDescription>Distribuição de consultas entre particular e convênios</CardDescription>
            </CardHeader>
            <CardContent>
              {dadosPorConvenio.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo / Convênio</TableHead>
                        <TableHead className="text-center">Consultas</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-right">Valor Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosPorConvenio.map((d) => (
                        <TableRow key={d.nome}>
                          <TableCell className="font-medium">
                            <Badge variant={d.nome === "Particular" ? "default" : "secondary"}>
                              {d.nome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{d.consultas}</TableCell>
                          <TableCell className="text-right">{formatCurrency(d.valor)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(d.pago)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Consultations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Consultas do Período ({filteredConsultas.length})</CardTitle>
          <CardDescription>Visualize os detalhes de cada consulta</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConsultas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma consulta no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsultas.slice(0, 50).map((consulta) => (
                    <TableRow key={consulta.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(consulta.data_hora), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>Dr(a). {consulta.medico?.nome || "N/A"}</TableCell>
                      <TableCell>{getPatientName(consulta)}</TableCell>
                      <TableCell>{consulta.local?.nome_local || "-"}</TableCell>
                      <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={consulta.origem === "online" ? "default" : "secondary"}>
                                  {consulta.origem === "online" ? "Online" : "Interna"}
                                </Badge>
                                {consulta.tipo_atendimento === "convenio" && (
                                  <Badge variant="outline" className="text-xs">
                                    {consulta.convenio?.nome || "Convênio"}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(consulta.valor_consulta)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            consulta.status_pagamento === "pago"
                              ? "default"
                              : consulta.status_consulta === "cancelada"
                              ? "destructive"
                              : "secondary"
                          }
                          className={cn(
                            consulta.status_pagamento === "pago" && "bg-green-500 hover:bg-green-600"
                          )}
                        >
                          {consulta.status_pagamento === "pago"
                            ? "Pago"
                            : consulta.status_consulta === "cancelada"
                            ? "Cancelada"
                            : "Pendente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredConsultas.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Mostrando 50 de {filteredConsultas.length} consultas. Exporte para ver todos os dados.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  Filter,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Loader2,
  ArrowRightLeft,
  Globe,
  Building2,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ConsultaRepasse {
  id: string;
  data_hora: string;
  valor_consulta: number;
  valor_medico: number;
  valor_plataforma: number;
  status_consulta: string;
  status_pagamento: string;
  origem: string;
  elegivel_repasse: boolean;
  finalizado_medico: boolean;
  finalizado_paciente: boolean;
  incluida_em_repasse: boolean;
  medico: { id: string; nome: string; especialidade: string } | null;
  paciente: { nome: string } | null;
  nome_paciente_consulta: string | null;
}

interface RepasseMedico {
  id: string;
  medico_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total: number;
  status: string;
  data_prevista_pagamento: string | null;
  data_pagamento: string | null;
  asaas_transfer_id: string | null;
  created_at: string;
  medico: { nome: string } | null;
}

export default function AdminRepasses() {
  const queryClient = useQueryClient();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    dataInicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dataFim: format(addDays(new Date(), 90), "yyyy-MM-dd"),
    medicoId: "all",
    origem: "all",
    statusPagamento: "all",
    statusConsulta: "all",
    apenasElegiveis: true,
    search: "",
  });

  const [selectedConsultas, setSelectedConsultas] = useState<string[]>([]);
  const [gerarRepasseModalOpen, setGerarRepasseModalOpen] = useState(false);
  const [selectedMedicoForRepasse, setSelectedMedicoForRepasse] = useState<string | null>(null);

  // Fetch consultas eligible for repasse
  const { data: consultas, isLoading: loadingConsultas } = useQuery({
    queryKey: ["admin-consultas-repasse", filters],
    queryFn: async () => {
      let query = supabase
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
          elegivel_repasse,
          finalizado_medico,
          finalizado_paciente,
          incluida_em_repasse,
          nome_paciente_consulta,
          medico:medicos!consultas_medico_id_fkey(id, nome, especialidade),
          paciente:pacientes!consultas_paciente_id_fkey(nome)
        `)
        .eq("origem", "online") // Only online consultations
        .order("data_hora", { ascending: false });

      if (filters.dataInicio) {
        query = query.gte("data_hora", `${filters.dataInicio}T00:00:00`);
      }
      if (filters.dataFim) {
        query = query.lte("data_hora", `${filters.dataFim}T23:59:59`);
      }
      if (filters.medicoId !== "all") {
        query = query.eq("medico_id", filters.medicoId);
      }
      if (filters.statusPagamento !== "all") {
        query = query.eq("status_pagamento", filters.statusPagamento);
      }
      if (filters.statusConsulta !== "all") {
        query = query.eq("status_consulta", filters.statusConsulta);
      }
      if (filters.apenasElegiveis) {
        query = query.eq("elegivel_repasse", true);
        query = query.eq("incluida_em_repasse", false);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search
      let result = data || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (c: any) =>
            c.medico?.nome?.toLowerCase().includes(searchLower) ||
            c.paciente?.nome?.toLowerCase().includes(searchLower) ||
            c.nome_paciente_consulta?.toLowerCase().includes(searchLower)
        );
      }

      return result as ConsultaRepasse[];
    },
  });

  // Fetch medicos for filter
  const { data: medicos } = useQuery({
    queryKey: ["admin-medicos-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing repasses
  const { data: repasses, isLoading: loadingRepasses } = useQuery({
    queryKey: ["admin-repasses-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repasses_medico")
        .select(`
          *,
          medico:medicos(nome)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as RepasseMedico[];
    },
  });

  // Generate repasse mutation
  const gerarRepasseMutation = useMutation({
    mutationFn: async ({ medicoId, consultaIds }: { medicoId: string; consultaIds: string[] }) => {
      // Get consulta values
      const { data: consultasData, error: consultasError } = await supabase
        .from("consultas")
        .select("id, valor_medico, data_hora")
        .in("id", consultaIds);

      if (consultasError) throw consultasError;
      if (!consultasData || consultasData.length === 0) {
        throw new Error("Nenhuma consulta encontrada");
      }

      // Calculate total and date range
      const valorTotal = consultasData.reduce((sum, c) => sum + (c.valor_medico || 0), 0);
      const dates = consultasData.map(c => new Date(c.data_hora));
      const periodoInicio = new Date(Math.min(...dates.map(d => d.getTime())));
      const periodoFim = new Date(Math.max(...dates.map(d => d.getTime())));

      // Create repasse
      const { data: repasse, error: repasseError } = await supabase
        .from("repasses_medico")
        .insert({
          medico_id: medicoId,
          periodo_inicio: format(periodoInicio, "yyyy-MM-dd"),
          periodo_fim: format(periodoFim, "yyyy-MM-dd"),
          valor_total: valorTotal,
          status: "pendente",
          data_prevista_pagamento: format(addDays(new Date(), 7), "yyyy-MM-dd"),
        })
        .select()
        .single();

      if (repasseError) throw repasseError;

      // Create repasse items
      const repasseItens = consultasData.map(c => ({
        repasse_id: repasse.id,
        consulta_id: c.id,
        valor_medico: c.valor_medico,
      }));

      const { error: itensError } = await supabase
        .from("repasses_itens")
        .insert(repasseItens);

      if (itensError) throw itensError;

      // Update consultas to mark as included in repasse
      const { error: updateError } = await supabase
        .from("consultas")
        .update({ incluida_em_repasse: true })
        .in("id", consultaIds);

      if (updateError) throw updateError;

      // Create event logs for each consulta
      const eventos = consultaIds.map(consultaId => ({
        consulta_id: consultaId,
        tipo_evento: "repasse_gerado",
        descricao: `Consulta incluída no repasse ${repasse.id}`,
        usuario_tipo: "admin",
      }));

      await supabase.from("consultas_eventos").insert(eventos);

      return repasse;
    },
    onSuccess: () => {
      toast.success("Repasse gerado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-consultas-repasse"] });
      queryClient.invalidateQueries({ queryKey: ["admin-repasses-list"] });
      setSelectedConsultas([]);
      setGerarRepasseModalOpen(false);
    },
    onError: (error) => {
      console.error("Error generating repasse:", error);
      toast.error("Erro ao gerar repasse. Tente novamente.");
    },
  });

  // Stats
  const stats = useMemo(() => {
    const elegiveis = consultas?.filter(c => c.elegivel_repasse && !c.incluida_em_repasse) || [];
    const total = elegiveis.length;
    const valorTotal = elegiveis.reduce((sum, c) => sum + (c.valor_medico || 0), 0);
    
    const pendentes = repasses?.filter(r => r.status === "pendente") || [];
    const valorPendente = pendentes.reduce((sum, r) => sum + (r.valor_total || 0), 0);

    const pagos = repasses?.filter(r => r.status === "pago") || [];
    const valorPago = pagos.reduce((sum, r) => sum + (r.valor_total || 0), 0);

    return { total, valorTotal, pendentes: pendentes.length, valorPendente, pagos: pagos.length, valorPago };
  }, [consultas, repasses]);

  // Group selected consultas by medico
  const selectedByMedico = useMemo(() => {
    const map = new Map<string, { medicoId: string; medicoNome: string; consultas: ConsultaRepasse[] }>();
    
    selectedConsultas.forEach(id => {
      const consulta = consultas?.find(c => c.id === id);
      if (consulta?.medico) {
        const key = consulta.medico.id;
        if (!map.has(key)) {
          map.set(key, {
            medicoId: consulta.medico.id,
            medicoNome: consulta.medico.nome,
            consultas: [],
          });
        }
        map.get(key)?.consultas.push(consulta);
      }
    });

    return Array.from(map.values());
  }, [selectedConsultas, consultas]);

  const handleSelectAll = () => {
    if (selectedConsultas.length === (consultas?.length || 0)) {
      setSelectedConsultas([]);
    } else {
      setSelectedConsultas(consultas?.map(c => c.id) || []);
    }
  };

  const handleSelectConsulta = (id: string) => {
    setSelectedConsultas(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleGerarRepasse = () => {
    if (selectedByMedico.length === 0) {
      toast.error("Selecione pelo menos uma consulta");
      return;
    }
    if (selectedByMedico.length > 1) {
      setGerarRepasseModalOpen(true);
    } else {
      const grupo = selectedByMedico[0];
      gerarRepasseMutation.mutate({
        medicoId: grupo.medicoId,
        consultaIds: grupo.consultas.map(c => c.id),
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pendente</Badge>;
      case "agendado":
        return <Badge className="bg-blue-500/10 text-blue-600">Agendado</Badge>;
      case "processando":
        return <Badge className="bg-purple-500/10 text-purple-600">Processando</Badge>;
      case "pago":
        return <Badge className="bg-green-500/10 text-green-600">Pago</Badge>;
      case "erro":
        return <Badge className="bg-red-500/10 text-red-600">Erro</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setFilters({
      dataInicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      dataFim: format(addDays(new Date(), 90), "yyyy-MM-dd"),
      medicoId: "all",
      origem: "all",
      statusPagamento: "all",
      statusConsulta: "all",
      apenasElegiveis: true,
      search: "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="h-7 w-7" />
            Fila de Repasses
          </h1>
          <p className="text-muted-foreground">
            Gerencie consultas realizadas online e gere repasses para os médicos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consultas Elegíveis</p>
                <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(stats.valorTotal)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Repasses Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(stats.valorPendente)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Repasses Pagos</p>
                <p className="text-3xl font-bold text-green-600">{stats.pagos}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(stats.valorPago)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selecionadas</p>
                <p className="text-3xl font-bold text-foreground">{selectedConsultas.length}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(
                    selectedConsultas.reduce((sum, id) => {
                      const c = consultas?.find(c => c.id === id);
                      return sum + (c?.valor_medico || 0);
                    }, 0)
                  )}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <ArrowRightLeft className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="gap-2 p-0 h-auto font-semibold">
                  <Filter className="h-5 w-5" />
                  Filtros
                  {filtersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar médico ou paciente..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Inicial</Label>
                  <Input
                    type="date"
                    value={filters.dataInicio}
                    onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Final</Label>
                  <Input
                    type="date"
                    value={filters.dataFim}
                    onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                  />
                </div>
                <Select
                  value={filters.medicoId}
                  onValueChange={(value) => setFilters({ ...filters, medicoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Médico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os médicos</SelectItem>
                    {medicos?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.statusConsulta}
                  onValueChange={(value) => setFilters({ ...filters, statusConsulta: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status Consulta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="atendida_medico">Atendida</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Checkbox
                  id="apenasElegiveis"
                  checked={filters.apenasElegiveis}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, apenasElegiveis: checked as boolean })
                  }
                />
                <Label htmlFor="apenasElegiveis" className="text-sm cursor-pointer">
                  Apenas elegíveis para repasse (não incluídas em repasse anterior)
                </Label>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Action Bar */}
      {selectedConsultas.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {selectedConsultas.length} consulta(s) selecionada(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedByMedico.length} médico(s) • Total:{" "}
                  {formatCurrency(
                    selectedConsultas.reduce((sum, id) => {
                      const c = consultas?.find(c => c.id === id);
                      return sum + (c?.valor_medico || 0);
                    }, 0)
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedConsultas([])}>
                  Limpar seleção
                </Button>
                <Button onClick={handleGerarRepasse} disabled={gerarRepasseMutation.isPending}>
                  {gerarRepasseMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4 mr-2" />
                  )}
                  Gerar Repasse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consultas Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Consultas Online Realizadas
          </CardTitle>
          <CardDescription>
            Consultas elegíveis para repasse (pagas, finalizadas, origem online)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingConsultas ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : consultas && consultas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedConsultas.length === consultas.length && consultas.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Valor Médico</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Elegível</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.map((consulta) => (
                    <TableRow
                      key={consulta.id}
                      className={selectedConsultas.includes(consulta.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedConsultas.includes(consulta.id)}
                          onCheckedChange={() => handleSelectConsulta(consulta.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {consulta.nome_paciente_consulta || consulta.paciente?.nome || "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{consulta.medico?.nome || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {consulta.medico?.especialidade}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(consulta.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(consulta.valor_medico)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            consulta.status_pagamento === "pago"
                              ? "bg-green-500/10 text-green-600"
                              : consulta.status_pagamento === "pendente"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-muted"
                          }
                        >
                          {consulta.status_pagamento}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {consulta.finalizado_medico ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {consulta.finalizado_paciente ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            consulta.status_consulta === "concluida"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : consulta.status_consulta === "atendida_medico"
                              ? "bg-blue-500/10 text-blue-600"
                              : consulta.status_consulta === "confirmada"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-muted"
                          }
                        >
                          {consulta.status_consulta === "concluida" ? "Concluída" : 
                           consulta.status_consulta === "atendida_medico" ? "Atendida (méd)" :
                           consulta.status_consulta === "confirmada" ? "Confirmada" :
                           consulta.status_consulta}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {consulta.elegivel_repasse ? (
                          consulta.incluida_em_repasse ? (
                            <Badge className="bg-purple-500/10 text-purple-600">Em repasse</Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-600">Sim</Badge>
                          )
                        ) : (
                          <Badge className="bg-muted text-muted-foreground">Não</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repasses History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Histórico de Repasses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRepasses ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : repasses && repasses.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Médico</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repasses.map((repasse) => (
                    <TableRow key={repasse.id}>
                      <TableCell className="font-medium">
                        {repasse.medico?.nome || "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(repasse.periodo_inicio), "dd/MM/yy")} -{" "}
                        {format(new Date(repasse.periodo_fim), "dd/MM/yy")}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(repasse.valor_total)}
                      </TableCell>
                      <TableCell>{getStatusBadge(repasse.status)}</TableCell>
                      <TableCell>
                        {repasse.data_prevista_pagamento
                          ? format(new Date(repasse.data_prevista_pagamento), "dd/MM/yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {repasse.data_pagamento
                          ? format(new Date(repasse.data_pagamento), "dd/MM/yyyy HH:mm")
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum repasse registrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multiple Medicos Modal */}
      <Dialog open={gerarRepasseModalOpen} onOpenChange={setGerarRepasseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Múltiplos Médicos Selecionados
            </DialogTitle>
            <DialogDescription>
              As consultas selecionadas pertencem a {selectedByMedico.length} médicos diferentes.
              Escolha para qual médico gerar o repasse:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {selectedByMedico.map((grupo) => (
              <div
                key={grupo.medicoId}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedMedicoForRepasse === grupo.medicoId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
                onClick={() => setSelectedMedicoForRepasse(grupo.medicoId)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{grupo.medicoNome}</p>
                    <p className="text-sm text-muted-foreground">
                      {grupo.consultas.length} consulta(s) •{" "}
                      {formatCurrency(
                        grupo.consultas.reduce((sum, c) => sum + (c.valor_medico || 0), 0)
                      )}
                    </p>
                  </div>
                  <Checkbox checked={selectedMedicoForRepasse === grupo.medicoId} />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGerarRepasseModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const grupo = selectedByMedico.find(g => g.medicoId === selectedMedicoForRepasse);
                if (grupo) {
                  gerarRepasseMutation.mutate({
                    medicoId: grupo.medicoId,
                    consultaIds: grupo.consultas.map(c => c.id),
                  });
                }
              }}
              disabled={!selectedMedicoForRepasse || gerarRepasseMutation.isPending}
            >
              {gerarRepasseMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Gerar Repasse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

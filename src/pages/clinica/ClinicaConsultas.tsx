import { useState, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, Filter, ChevronDown, Globe, Building2 } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodFilter = "7d" | "30d" | "60d" | "90d" | "180d" | "365d";

export default function ClinicaConsultas() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [medicoFilter, setMedicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");

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
          medico:medicos!consultas_medico_id_fkey(nome, especialidade),
          paciente:pacientes(nome),
          local:locais_atendimento(nome_local)
        `)
        .in("medico_id", medicoIds)
        .gte("data_hora", dateRange.start.toISOString())
        .lte("data_hora", dateRange.end.toISOString())
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  const filteredConsultas = useMemo(() => {
    if (!consultas) return [];
    
    return consultas.filter((c: any) => {
      const matchSearch = 
        c.medico?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.paciente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        c.nome_paciente_consulta?.toLowerCase().includes(search.toLowerCase());

      const matchMedico = medicoFilter === "todos" || c.medico_id === medicoFilter;

      const matchStatus = statusFilter === "todos" ||
        (statusFilter === "confirmada" && c.status_consulta === "confirmada") ||
        (statusFilter === "aguardando" && c.status_consulta === "aguardando_pagamento") ||
        (statusFilter === "concluida" && c.status_consulta === "concluida") ||
        (statusFilter === "cancelada" && c.status_consulta === "cancelada");

      const matchOrigem = origemFilter === "todos" || c.origem === origemFilter;

      return matchSearch && matchMedico && matchStatus && matchOrigem;
    });
  }, [consultas, search, medicoFilter, statusFilter, origemFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmada":
        return <Badge className="bg-green-500">Confirmada</Badge>;
      case "aguardando_pagamento":
        return <Badge className="bg-yellow-500">Aguardando Pagamento</Badge>;
      case "cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      case "concluida":
        return <Badge className="bg-blue-500">Concluída</Badge>;
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
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="aguardando">Aguardando Pagamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
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
                <Card key={consulta.id} className="hover:shadow-md transition-shadow">
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
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Dr(a). {consulta.medico?.nome} • {consulta.medico?.especialidade}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {consulta.local?.nome_local && ` • ${consulta.local.nome_local}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          R$ {consulta.valor_consulta?.toFixed(2)}
                        </span>
                        {getStatusBadge(consulta.status_consulta)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

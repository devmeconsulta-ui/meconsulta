import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Phone, MapPin, Eye, Download, Filter, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PacienteDetalhesModal } from "@/components/clinica/PacienteDetalhesModal";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";

export default function ClinicaPacientes() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [selectedConsultaCount, setSelectedConsultaCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Advanced filters
  const [filterCidade, setFilterCidade] = useState<string>("all");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterMinConsultas, setFilterMinConsultas] = useState<string>("all");

  const { data: pacientes, isLoading, refetch } = useQuery({
    queryKey: ["clinica-pacientes", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      // First, get doctors linked to this clinic
      const { data: vinculos } = await supabase
        .from("clinicas_medicos")
        .select("medico_id")
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      const medicoIds = vinculos?.map((v) => v.medico_id) || [];
      if (medicoIds.length === 0) return [];

      // IMPORTANTE: Filtrar por clinica_id para isolar dados entre clínicas
      const { data: consultas, error } = await supabase
        .from("consultas")
        .select(`
          paciente_id,
          paciente:pacientes(
            id,
            nome,
            telefone,
            cpf,
            cidade,
            estado,
            bairro,
            data_nascimento
          )
        `)
        .eq("clinica_id", clinicaData.id)
        .in("medico_id", medicoIds)
        .not("paciente_id", "is", null);

      if (error) throw error;

      // Get unique patients with consultation count
      const pacienteMap = new Map<string, { paciente: any; consultaCount: number }>();
      consultas?.forEach((c: any) => {
        if (c.paciente) {
          const existing = pacienteMap.get(c.paciente.id);
          if (existing) {
            existing.consultaCount++;
          } else {
            pacienteMap.set(c.paciente.id, { paciente: c.paciente, consultaCount: 1 });
          }
        }
      });

      return Array.from(pacienteMap.values());
    },
    enabled: !!clinicaData?.id,
  });

  // Get unique cities and states for filter options
  const { cidades, estados } = useMemo(() => {
    const cidadesSet = new Set<string>();
    const estadosSet = new Set<string>();
    
    pacientes?.forEach((item: any) => {
      if (item.paciente.cidade) cidadesSet.add(item.paciente.cidade);
      if (item.paciente.estado) estadosSet.add(item.paciente.estado);
    });

    return {
      cidades: Array.from(cidadesSet).sort(),
      estados: Array.from(estadosSet).sort(),
    };
  }, [pacientes]);

  const filteredPacientes = useMemo(() => {
    return pacientes?.filter((item: any) => {
      // Text search
      const matchesSearch =
        item.paciente.nome?.toLowerCase().includes(search.toLowerCase()) ||
        item.paciente.cpf?.includes(search);

      // City filter
      const matchesCidade =
        filterCidade === "all" || item.paciente.cidade === filterCidade;

      // State filter
      const matchesEstado =
        filterEstado === "all" || item.paciente.estado === filterEstado;

      // Min consultations filter
      let matchesConsultas = true;
      if (filterMinConsultas !== "all") {
        const minCount = parseInt(filterMinConsultas);
        matchesConsultas = item.consultaCount >= minCount;
      }

      return matchesSearch && matchesCidade && matchesEstado && matchesConsultas;
    });
  }, [pacientes, search, filterCidade, filterEstado, filterMinConsultas]);

  const activeFiltersCount = [filterCidade, filterEstado, filterMinConsultas].filter(
    (f) => f !== "all"
  ).length;

  const clearFilters = () => {
    setFilterCidade("all");
    setFilterEstado("all");
    setFilterMinConsultas("all");
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "??";
  };

  const handleOpenDetails = (item: any) => {
    setSelectedPaciente(item.paciente);
    setSelectedConsultaCount(item.consultaCount);
    setModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!filteredPacientes || filteredPacientes.length === 0) {
      toast.error("Nenhum paciente para exportar");
      return;
    }

    const headers = ["Nome", "CPF", "Telefone", "Cidade", "Estado", "Consultas"];
    const rows = filteredPacientes.map((item: any) => [
      item.paciente.nome || "",
      item.paciente.cpf || "",
      item.paciente.telefone || "",
      item.paciente.cidade || "",
      item.paciente.estado || "",
      item.consultaCount.toString(),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((row: string[]) => row.join(";")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pacientes_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Lista de pacientes exportada com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">
            Pacientes que já realizaram consultas na clínica.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={!filteredPacientes?.length}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Filtros Avançados</span>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-8 text-muted-foreground"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Estado</Label>
                    <Select value={filterEstado} onValueChange={setFilterEstado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os estados</SelectItem>
                        {estados.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Cidade</Label>
                    <Select value={filterCidade} onValueChange={setFilterCidade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as cidades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as cidades</SelectItem>
                        {cidades.map((cidade) => (
                          <SelectItem key={cidade} value={cidade}>
                            {cidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Mín. de Consultas</Label>
                    <Select value={filterMinConsultas} onValueChange={setFilterMinConsultas}>
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer quantidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer quantidade</SelectItem>
                        <SelectItem value="2">2+ consultas</SelectItem>
                        <SelectItem value="3">3+ consultas</SelectItem>
                        <SelectItem value="5">5+ consultas</SelectItem>
                        <SelectItem value="10">10+ consultas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredPacientes?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum paciente encontrado.
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  {filteredPacientes.length} paciente{filteredPacientes.length !== 1 ? "s" : ""} encontrado{filteredPacientes.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead className="text-center">Consultas</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPacientes?.map((item: any) => (
                      <TableRow key={item.paciente.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell onClick={() => handleOpenDetails(item)}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {getInitials(item.paciente.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{item.paciente.nome}</p>
                              {item.paciente.cpf && (
                                <p className="text-xs text-muted-foreground">
                                  CPF: {item.paciente.cpf}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => handleOpenDetails(item)}>
                          {item.paciente.telefone ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {item.paciente.telefone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell onClick={() => handleOpenDetails(item)}>
                          {item.paciente.cidade && item.paciente.estado ? (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {item.paciente.cidade} - {item.paciente.estado}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={() => handleOpenDetails(item)}>
                          <Badge variant="secondary">
                            {item.consultaCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetails(item)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PacienteDetalhesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        paciente={selectedPaciente}
        consultaCount={selectedConsultaCount}
        onUpdate={() => refetch()}
      />
    </div>
  );
}

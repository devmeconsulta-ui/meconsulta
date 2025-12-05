import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  Search, 
  User, 
  Clock,
  Eye,
  Loader2,
  FileText,
  Globe,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ConsultaDetalhesModal from "@/components/medico/ConsultaDetalhesModal";

interface Consulta {
  id: string;
  data_hora: string;
  status_consulta: string;
  motivo_consulta: string | null;
  nome_paciente_consulta: string | null;
  origem: string | null;
  paciente: {
    id: string;
    nome: string;
    cpf: string | null;
    data_nascimento: string | null;
    cidade: string | null;
    estado: string | null;
    bairro: string | null;
  } | null;
  dependente: {
    id: string;
    nome: string;
    parentesco: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando Pagamento",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

const statusColors: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-500/10 text-yellow-600",
  confirmada: "bg-blue-500/10 text-blue-600",
  realizada: "bg-green-500/10 text-green-600",
  cancelada: "bg-red-500/10 text-red-600",
};

export default function MedicoConsultas() {
  const { currentUser } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.medicoId) {
      fetchConsultas();
    }
  }, [currentUser?.medicoId]);

  async function fetchConsultas() {
    if (!currentUser?.medicoId) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        status_consulta,
        motivo_consulta,
        nome_paciente_consulta,
        origem,
        paciente:pacientes(id, nome, cpf, data_nascimento, cidade, estado, bairro),
        dependente:paciente_dependentes(id, nome, parentesco)
      `)
      .eq("medico_id", currentUser.medicoId)
      .order("data_hora", { ascending: false });

    if (error) {
      console.error("Error fetching consultas:", error);
    } else {
      setConsultas(data || []);
    }
    
    setLoading(false);
  }

  const filteredConsultas = consultas.filter((consulta) => {
    const matchesSearch = 
      consulta.nome_paciente_consulta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consulta.paciente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consulta.dependente?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "todos" || consulta.status_consulta === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (consulta: Consulta) => {
    setSelectedConsulta(consulta);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Minhas Consultas</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas consultas e acesse os dados dos pacientes
        </p>
      </div>

      {/* Filters */}
      <Card className="card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome do paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="realizada">Realizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {consultas.filter(c => c.status_consulta === "confirmada").length}
                </p>
                <p className="text-xs text-muted-foreground">Confirmadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {consultas.filter(c => c.status_consulta === "aguardando_pagamento").length}
                </p>
                <p className="text-xs text-muted-foreground">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {consultas.filter(c => c.status_consulta === "realizada").length}
                </p>
                <p className="text-xs text-muted-foreground">Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{consultas.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultas List */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Lista de Consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredConsultas.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultas.map((consulta) => (
                <div
                  key={consulta.id}
                  className="p-4 bg-muted/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente"}
                        </h3>
                        {consulta.dependente && (
                          <p className="text-sm text-muted-foreground">
                            Dependente de {consulta.paciente?.nome} ({consulta.dependente.parentesco})
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                        {consulta.motivo_consulta && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">Motivo:</span> {consulta.motivo_consulta}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Origin badge */}
                      {consulta.origem === "online" ? (
                        <Badge className="bg-blue-500/10 text-blue-600 gap-1">
                          <Globe className="w-3 h-3" />
                          Online
                        </Badge>
                      ) : consulta.origem === "interna" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 gap-1">
                          <Building2 className="w-3 h-3" />
                          Interna
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">
                          -
                        </Badge>
                      )}
                      <Badge className={statusColors[consulta.status_consulta] || "bg-muted"}>
                        {statusLabels[consulta.status_consulta] || consulta.status_consulta}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleViewDetails(consulta)}
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedConsulta && (
        <ConsultaDetalhesModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          consulta={selectedConsulta}
          onUpdate={fetchConsultas}
        />
      )}
    </div>
  );
}
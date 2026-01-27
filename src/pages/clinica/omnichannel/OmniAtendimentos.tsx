import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  UserPlus,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string; usuarioClinicaId?: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  aguardando: "bg-yellow-100 text-yellow-800",
  em_atendimento: "bg-blue-100 text-blue-800",
  finalizado: "bg-green-100 text-green-800",
  abandonado: "bg-gray-100 text-gray-800",
};

const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-600",
  alta: "bg-orange-100 text-orange-600",
  urgente: "bg-red-100 text-red-600",
};

export default function OmniAtendimentos() {
  const { clinicaData, currentUser } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filaFilter, setFilaFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const statusArray = statusFilter === "all" ? undefined : [statusFilter];
  const filaId = filaFilter === "all" ? undefined : filaFilter;

  const {
    atendimentos,
    loading,
    atribuirAtendimento,
    finalizarAtendimento,
  } = useOmniAtendimentos(clinicaId, { status: statusArray, filaId });

  const { filas } = useOmniFilas(clinicaId);

  const filteredAtendimentos = atendimentos.filter((a) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      a.contato?.nome?.toLowerCase().includes(search) ||
      a.contato?.telefone?.includes(search) ||
      a.protocolo.toString().includes(search)
    );
  });

  const handleAtribuir = async (atendimentoId: string) => {
    if (!currentUser?.usuarioClinicaId) {
      return;
    }
    await atribuirAtendimento(atendimentoId, currentUser.usuarioClinicaId);
  };

  const handleFinalizar = async (atendimentoId: string) => {
    await finalizarAtendimento(atendimentoId, "Finalizado pelo agente");
  };

  const handleAbrirChat = (atendimentoId: string) => {
    navigate(`/clinica/omnichannel/chat/${atendimentoId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Atendimentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os atendimentos da clínica
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou protocolo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="abandonado">Abandonado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filaFilter} onValueChange={setFilaFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Fila" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filas</SelectItem>
                {filas.map((fila) => (
                  <SelectItem key={fila.id} value={fila.id}>
                    {fila.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Atendimentos */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Fila</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Tempo de Espera</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAtendimentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum atendimento encontrado
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAtendimentos.map((atendimento) => (
                  <TableRow key={atendimento.id}>
                    <TableCell className="font-mono">
                      #{atendimento.protocolo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {atendimento.contato?.nome || "Desconhecido"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {atendimento.contato?.telefone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {atendimento.fila ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: atendimento.fila.cor }}
                          />
                          {atendimento.fila.nome}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={STATUS_COLORS[atendimento.status]}
                        variant="secondary"
                      >
                        {atendimento.status === "aguardando"
                          ? "Aguardando"
                          : atendimento.status === "em_atendimento"
                          ? "Em Atendimento"
                          : atendimento.status === "finalizado"
                          ? "Finalizado"
                          : "Abandonado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={PRIORIDADE_COLORS[atendimento.prioridade]}
                        variant="secondary"
                      >
                        {atendimento.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(atendimento.data_abertura), {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {atendimento.agente?.nome || (
                        <span className="text-muted-foreground">Não atribuído</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleAbrirChat(atendimento.id)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Abrir Chat
                          </DropdownMenuItem>
                          {atendimento.status === "aguardando" && (
                            <DropdownMenuItem
                              onClick={() => handleAtribuir(atendimento.id)}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Atribuir a Mim
                            </DropdownMenuItem>
                          )}
                          {atendimento.status === "em_atendimento" && (
                            <>
                              <DropdownMenuItem>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Transferir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleFinalizar(atendimento.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Finalizar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

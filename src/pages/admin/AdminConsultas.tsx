import { useState } from "react";
import { Filter } from "lucide-react";
import { useConsultas } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConsultaColors: Record<string, string> = {
  aguardando_pagamento: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

const statusPagamentoColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  pago: "bg-green-100 text-green-800",
  falhou: "bg-red-100 text-red-800",
};

export default function AdminConsultas() {
  const [filters, setFilters] = useState({
    dataInicio: "",
    dataFim: "",
    statusConsulta: "",
    statusPagamento: "",
  });

  const { data: consultas, isLoading } = useConsultas({
    dataInicio: filters.dataInicio || undefined,
    dataFim: filters.dataFim || undefined,
    statusConsulta: filters.statusConsulta || undefined,
    statusPagamento: filters.statusPagamento || undefined,
  });

  const clearFilters = () => {
    setFilters({
      dataInicio: "",
      dataFim: "",
      statusConsulta: "",
      statusPagamento: "",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consultas</h1>
        <p className="text-muted-foreground">Visualize todas as consultas do sistema</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Inicial</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Final</Label>
              <Input
                id="dataFim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status Consulta</Label>
              <Select
                value={filters.statusConsulta}
                onValueChange={(value) =>
                  setFilters({ ...filters, statusConsulta: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aguardando_pagamento">Aguardando Pagamento</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Pagamento</Label>
              <Select
                value={filters.statusPagamento}
                onValueChange={(value) =>
                  setFilters({ ...filters, statusPagamento: value === "all" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="falhou">Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                    <TableHead>Paciente</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status Consulta</TableHead>
                    <TableHead>Status Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultas.map((consulta: any) => (
                    <TableRow key={consulta.id}>
                      <TableCell className="font-medium">
                        {consulta.paciente?.nome || "—"}
                      </TableCell>
                      <TableCell>{consulta.medico?.nome || "—"}</TableCell>
                      <TableCell>
                        {format(new Date(consulta.data_hora), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(consulta.valor_consulta)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusConsultaColors[consulta.status_consulta] || ""}
                        >
                          {consulta.status_consulta.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusPagamentoColors[consulta.status_pagamento] || ""}
                        >
                          {consulta.status_pagamento}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma consulta encontrada com os filtros selecionados.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

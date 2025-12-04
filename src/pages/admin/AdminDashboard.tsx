import { Stethoscope, Users, Calendar, CreditCard } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { WelcomeHeader } from "@/components/admin/WelcomeHeader";
import { useDashboardStats, useLatestConsultas } from "@/hooks/useAdminData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: consultas, isLoading: consultasLoading } = useLatestConsultas(10);

  return (
    <div className="space-y-8">
      {/* Welcome Header with Date/Time and Weather */}
      <WelcomeHeader />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema MeConsulta</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Médicos Ativos"
              value={stats?.totalMedicos || 0}
              icon={Stethoscope}
              description="Total cadastrados"
            />
            <StatCard
              title="Total de Pacientes"
              value={stats?.totalPacientes || 0}
              icon={Users}
              description="Registrados no sistema"
            />
            <StatCard
              title="Consultas Hoje"
              value={stats?.consultasHoje || 0}
              icon={Calendar}
              description="Agendadas para hoje"
            />
            <StatCard
              title="Consultas Pagas"
              value={stats?.consultasPagas || 0}
              icon={CreditCard}
              description="Últimos 7 dias"
              trend="up"
            />
          </>
        )}
      </div>

      {/* Latest Consultas Table */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Consultas</CardTitle>
        </CardHeader>
        <CardContent>
          {consultasLoading ? (
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
              Nenhuma consulta registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

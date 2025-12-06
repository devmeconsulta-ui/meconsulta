import { Stethoscope, Users, Calendar, CreditCard } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
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
  aguardando_pagamento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmada: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statusPagamentoColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  pago: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  falhou: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: consultas, isLoading: consultasLoading } = useLatestConsultas(10);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Visão geral do sistema MeConsulta</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6">
                  <Skeleton className="h-16 sm:h-20 w-full" />
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
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Últimas Consultas</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {consultasLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : consultas && consultas.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[500px] px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Paciente</TableHead>
                      <TableHead className="text-xs sm:text-sm">Médico</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Data/Hora</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Pagamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consultas.map((consulta: any) => (
                      <TableRow key={consulta.id}>
                        <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">
                          {consulta.paciente?.nome?.split(" ")[0] || "—"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                          {consulta.medico?.nome?.split(" ")[0] || "—"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell py-2 sm:py-3">
                          {format(new Date(consulta.data_hora), "dd/MM HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="py-2 sm:py-3">
                          <Badge
                            variant="secondary"
                            className={`${statusConsultaColors[consulta.status_consulta] || ""} text-[10px] sm:text-xs whitespace-nowrap`}
                          >
                            {consulta.status_consulta.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-2 sm:py-3">
                          <Badge
                            variant="secondary"
                            className={`${statusPagamentoColors[consulta.status_pagamento] || ""} text-[10px] sm:text-xs`}
                          >
                            {consulta.status_pagamento}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8 text-sm">
              Nenhuma consulta registrada ainda.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

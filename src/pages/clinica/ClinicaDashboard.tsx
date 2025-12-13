import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, Calendar, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ClinicaDashboard() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();

  const { data: stats } = useQuery({
    queryKey: ["clinica-stats", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return { medicos: 0, consultas: 0, pacientes: 0 };

      // Count linked doctors
      const { count: medicosCount } = await supabase
        .from("clinicas_medicos")
        .select("*", { count: "exact", head: true })
        .eq("clinica_id", clinicaData.id)
        .eq("ativo", true);

      // Count consultations for this clinic
      const { count: consultasCount } = await supabase
        .from("consultas")
        .select("*", { count: "exact", head: true })
        .eq("clinica_id", clinicaData.id);

      // Count unique patients
      const { data: consultasData } = await supabase
        .from("consultas")
        .select("paciente_id")
        .eq("clinica_id", clinicaData.id)
        .not("paciente_id", "is", null);

      const uniquePacientes = new Set(consultasData?.map(c => c.paciente_id) || []);

      return {
        medicos: medicosCount || 0,
        consultas: consultasCount || 0,
        pacientes: uniquePacientes.size,
      };
    },
    enabled: !!clinicaData?.id,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bem-vindo, {clinicaData?.nome_fantasia || "Clínica"}!
        </h1>
        <p className="text-muted-foreground">
          Gerencie sua clínica e acompanhe as métricas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Médicos Vinculados
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.medicos || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Consultas
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.consultas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pacientes Atendidos
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pacientes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Ativo</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome Fantasia</p>
              <p className="font-medium">{clinicaData?.nome_fantasia || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Razão Social</p>
              <p className="font-medium">{clinicaData?.razao_social || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="font-medium">{clinicaData?.cnpj || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{clinicaData?.email_contato || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telefone</p>
              <p className="font-medium">{clinicaData?.telefone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Localização</p>
              <p className="font-medium">
                {clinicaData?.cidade && clinicaData?.estado 
                  ? `${clinicaData.cidade} - ${clinicaData.estado}` 
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

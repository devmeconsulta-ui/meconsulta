import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, CreditCard, Clock, Plus, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PacienteContext {
  pacienteData: any;
}

export default function PacienteDashboard() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    proximaConsulta: null as any,
    consultasMes: 0,
    pagamentosPendentes: 0,
  });
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!pacienteData?.id) return;

      const now = new Date().toISOString();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Próxima consulta
      const { data: proxima } = await supabase
        .from("consultas")
        .select(`
          *,
          medicos (nome, especialidade, foto_url),
          locais_atendimento:agenda_slots(local_id)
        `)
        .eq("paciente_id", pacienteData.id)
        .gte("data_hora", now)
        .neq("status_consulta", "cancelada")
        .order("data_hora", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Consultas no mês
      const { count: consultasMes } = await supabase
        .from("consultas")
        .select("*", { count: "exact", head: true })
        .eq("paciente_id", pacienteData.id)
        .gte("data_hora", startOfMonth.toISOString());

      // Pagamentos pendentes
      const { count: pendentes } = await supabase
        .from("consultas")
        .select("*", { count: "exact", head: true })
        .eq("paciente_id", pacienteData.id)
        .eq("status_pagamento", "pendente");

      // Próximas 5 consultas
      const { data: proximas } = await supabase
        .from("consultas")
        .select(`
          *,
          medicos (nome, especialidade, foto_url)
        `)
        .eq("paciente_id", pacienteData.id)
        .gte("data_hora", now)
        .neq("status_consulta", "cancelada")
        .order("data_hora", { ascending: true })
        .limit(5);

      setStats({
        proximaConsulta: proxima,
        consultasMes: consultasMes || 0,
        pagamentosPendentes: pendentes || 0,
      });
      setProximasConsultas(proximas || []);
      setLoading(false);
    }

    fetchData();
  }, [pacienteData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {pacienteData?.nome?.split(" ")[0] || "Paciente"}!
        </h1>
        <p className="text-muted-foreground">
          Acompanhe e agende suas consultas com facilidade.
        </p>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Próxima consulta</p>
                <p className="font-semibold text-sm">
                  {stats.proximaConsulta
                    ? format(new Date(stats.proximaConsulta.data_hora), "dd/MM 'às' HH:mm")
                    : "Nenhuma"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Consultas no mês</p>
                <p className="font-semibold text-lg">{stats.consultasMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagamentos pendentes</p>
                <p className="font-semibold text-lg">{stats.pagamentosPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Button */}
      <Button
        onClick={() => navigate("/paciente/marcar")}
        className="w-full h-14 text-lg font-semibold gap-2"
        size="lg"
      >
        <Plus className="w-5 h-5" />
        Marcar nova consulta
      </Button>

      {/* Próximas Consultas */}
      <Card className="card-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Próximas consultas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {proximasConsultas.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma consulta agendada
            </p>
          ) : (
            proximasConsultas.map((consulta) => (
              <div
                key={consulta.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {consulta.medicos?.foto_url ? (
                    <img
                      src={consulta.medicos.foto_url}
                      alt={consulta.medicos?.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    Dr(a). {consulta.medicos?.nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {consulta.medicos?.especialidade}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-primary font-medium">
                      {format(new Date(consulta.data_hora), "dd/MM 'às' HH:mm")}
                    </span>
                    {consulta.status_pagamento === "pendente" && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Pagamento pendente
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/paciente/consultas`)}
                >
                  Ver
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  CreditCard, 
  Clock, 
  Plus, 
  User, 
  TrendingUp,
  Heart,
  Star,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PendingConfirmationsAlert } from "@/components/paciente/PendingConfirmationsAlert";
import PartnersCarousel from "@/components/PartnersCarousel";

interface PacienteContext {
  pacienteData: any;
}

export default function PacienteDashboard() {
  const { pacienteData } = useOutletContext<PacienteContext>();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    proximaConsulta: null as any,
    consultasMes: 0,
    consultasTotal: 0,
    pagamentosPendentes: 0,
    favoritosCount: 0,
  });
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!pacienteData?.id) return;

      const now = new Date().toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();
      const monthEnd = endOfMonth(new Date()).toISOString();

      // Fetch all stats in parallel
      const [
        proximaResult,
        consultasMesResult,
        consultasTotalResult,
        pendentesResult,
        favoritosResult,
        proximasResult
      ] = await Promise.all([
        // Próxima consulta
        supabase
          .from("consultas")
          .select(`
            *,
            medicos!consultas_medico_id_fkey (nome, especialidade, foto_url),
            local:locais_atendimento (nome_local, endereco, cidade, estado)
          `)
          .eq("paciente_id", pacienteData.id)
          .gte("data_hora", now)
          .neq("status_consulta", "cancelada")
          .order("data_hora", { ascending: true })
          .limit(1)
          .maybeSingle(),

        // Consultas no mês
        supabase
          .from("consultas")
          .select("*", { count: "exact", head: true })
          .eq("paciente_id", pacienteData.id)
          .gte("data_hora", monthStart)
          .lte("data_hora", monthEnd),

        // Total de consultas
        supabase
          .from("consultas")
          .select("*", { count: "exact", head: true })
          .eq("paciente_id", pacienteData.id)
          .eq("status_consulta", "realizada"),

        // Pagamentos pendentes
        supabase
          .from("consultas")
          .select("*", { count: "exact", head: true })
          .eq("paciente_id", pacienteData.id)
          .eq("status_pagamento", "pendente"),

        // Favoritos
        supabase
          .from("paciente_favoritos")
          .select("*", { count: "exact", head: true })
          .eq("paciente_id", pacienteData.id),

        // Próximas 5 consultas com detalhes
        supabase
          .from("consultas")
          .select(`
            *,
            medicos!consultas_medico_id_fkey (id, nome, especialidade, foto_url),
            local:locais_atendimento (nome_local, endereco, cidade, estado)
          `)
          .eq("paciente_id", pacienteData.id)
          .gte("data_hora", now)
          .neq("status_consulta", "cancelada")
          .order("data_hora", { ascending: true })
          .limit(5)
      ]);

      setStats({
        proximaConsulta: proximaResult.data,
        consultasMes: consultasMesResult.count || 0,
        consultasTotal: consultasTotalResult.count || 0,
        pagamentosPendentes: pendentesResult.count || 0,
        favoritosCount: favoritosResult.count || 0,
      });
      setProximasConsultas(proximasResult.data || []);
      setLoading(false);
    }

    fetchData();
  }, [pacienteData]);

  const formatConsultaDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Olá, {pacienteData?.nome?.split(" ")[0] || "Paciente"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe suas consultas e cuide da sua saúde.
          </p>
          <p className="text-sm text-muted-foreground capitalize mt-1">{today}</p>
        </div>
        <Button
          onClick={() => navigate("/paciente/marcar")}
          size="lg"
          className="gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Marcar nova consulta
        </Button>
      </div>

      {/* Partners Section */}
      <PartnersCarousel 
        title="Parceiros" 
        subtitle="Empresas que confiam em nós"
        compact 
      />

      {/* Alert for pending confirmations */}
      <PendingConfirmationsAlert pacienteId={pacienteData?.id} />

      {/* Alert for pending payments */}
      {stats.pagamentosPendentes > 0 && (
        <Card className="border-red-400/50 dark:border-red-400/30 bg-red-50 dark:bg-red-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-700 dark:text-red-300">
                  Você tem {stats.pagamentosPendentes} pagamento(s) pendente(s)
                </p>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                  Finalize seus pagamentos para confirmar as consultas
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                onClick={() => navigate("/paciente/consultas")}
              >
                Ver consultas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shadow hover:shadow-md transition-shadow">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="mt-4">
              <p className="text-2xl lg:text-3xl font-bold">{stats.consultasMes}</p>
              <p className="text-sm text-muted-foreground">Consultas este mês</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:shadow-md transition-shadow">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl lg:text-3xl font-bold">{stats.consultasTotal}</p>
              <p className="text-sm text-muted-foreground">Consultas realizadas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:shadow-md transition-shadow">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl lg:text-3xl font-bold">{stats.pagamentosPendentes}</p>
              <p className="text-sm text-muted-foreground">Pagamentos pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow hover:shadow-md transition-shadow">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl lg:text-3xl font-bold">{stats.favoritosCount}</p>
              <p className="text-sm text-muted-foreground">Médicos favoritos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próxima Consulta */}
        <Card className="lg:col-span-2 card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Próxima Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.proximaConsulta ? (
              <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                  {stats.proximaConsulta.medicos?.foto_url ? (
                    <img
                      src={stats.proximaConsulta.medicos.foto_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    Dr(a). {stats.proximaConsulta.medicos?.nome}
                  </p>
                  <p className="text-muted-foreground">
                    {stats.proximaConsulta.medicos?.especialidade}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(stats.proximaConsulta.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <Clock className="w-4 h-4" />
                      {format(new Date(stats.proximaConsulta.data_hora), "HH:mm")}
                    </div>
                    {stats.proximaConsulta.local && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {stats.proximaConsulta.local.nome_local}
                        {stats.proximaConsulta.local.cidade && ` - ${stats.proximaConsulta.local.cidade}`}
                      </div>
                    )}
                  </div>
                  {stats.proximaConsulta.status_pagamento === "pendente" && (
                    <Badge variant="destructive" className="mt-3">
                      Pagamento pendente
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/paciente/consultas")}
                >
                  Ver detalhes
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  Você não tem consultas agendadas
                </p>
                <Button onClick={() => navigate("/paciente/marcar")}>
                  Agendar consulta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/paciente/marcar")}
            >
              <Plus className="w-5 h-5 text-primary" />
              Nova consulta
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/paciente/consultas")}
            >
              <Calendar className="w-5 h-5 text-primary" />
              Minhas consultas
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/paciente/favoritos")}
            >
              <Heart className="w-5 h-5 text-red-500" />
              Médicos favoritos
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/paciente/perfil")}
            >
              <User className="w-5 h-5 text-primary" />
              Meu perfil
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Consultas */}
      {proximasConsultas.length > 0 && (
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Próximas Consultas</CardTitle>
              <CardDescription>Suas consultas agendadas</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/paciente/consultas")}>
              Ver todas
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proximasConsultas.map((consulta) => (
                <div
                  key={consulta.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted/80 transition-colors cursor-pointer"
                  onClick={() => navigate("/paciente/consultas")}
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {consulta.medicos?.foto_url ? (
                      <img
                        src={consulta.medicos.foto_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      Dr(a). {consulta.medicos?.nome}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {consulta.medicos?.especialidade}
                    </p>
                    {consulta.local && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {consulta.local.nome_local}
                        {consulta.local.cidade && ` - ${consulta.local.cidade}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">
                      {formatConsultaDate(consulta.data_hora)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(consulta.data_hora), "HH:mm")}
                    </p>
                  </div>
                  {consulta.status_pagamento === "pendente" && (
                    <Badge variant="destructive" className="shrink-0">
                      Pendente
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

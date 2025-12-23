import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Star, DollarSign, User, MapPin, Timer, Users } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicoContext {
  medicoData: any;
}

// Componente para mostrar tempo (restante ou de espera)
function TempoEspera({ dataHora }: { dataHora: string }) {
  const [info, setInfo] = useState({ minutos: 0, atrasado: false });

  useEffect(() => {
    const calcular = () => {
      const agora = new Date();
      const horaConsulta = parseISO(dataHora);
      const diff = differenceInMinutes(agora, horaConsulta);
      
      if (diff >= 0) {
        // Já passou do horário - mostra tempo de espera/atraso
        setInfo({ minutos: diff, atrasado: true });
      } else {
        // Ainda não chegou - mostra tempo restante (máx 60 min)
        const restante = Math.abs(diff);
        if (restante <= 60) {
          setInfo({ minutos: restante, atrasado: false });
        } else {
          setInfo({ minutos: 0, atrasado: false });
        }
      }
    };

    calcular();
    const interval = setInterval(calcular, 30000);

    return () => clearInterval(interval);
  }, [dataHora]);

  if (!info.atrasado && info.minutos === 0) return null;

  if (info.atrasado) {
    return (
      <span className="text-red-600 font-medium animate-pulse">
        {info.minutos} min atrasado
      </span>
    );
  }

  return (
    <span className="text-green-600 font-medium">
      Falta {info.minutos} min
    </span>
  );
}

export default function MedicoDashboard() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [stats, setStats] = useState({
    consultasFuturas: 0,
    consultasHoje: 0,
    mediaAvaliacao: 0,
    valorMesConfirmado: 0,
    aguardando: 0,
  });
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);
  const [consultasAguardando, setConsultasAguardando] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!medicoData?.id) return;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

      // Consultas futuras
      const { count: futuras } = await supabase
        .from("consultas")
        .select("*", { count: "exact", head: true })
        .eq("medico_id", medicoData.id)
        .gte("data_hora", hoje.toISOString())
        .in("status_consulta", ["confirmada", "agendada"]);

      // Consultas de hoje
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      const { count: hojeCount } = await supabase
        .from("consultas")
        .select("*", { count: "exact", head: true })
        .eq("medico_id", medicoData.id)
        .gte("data_hora", hoje.toISOString())
        .lt("data_hora", amanha.toISOString());

      // Consultas aguardando
      const { data: aguardandoData, count: aguardandoCount } = await supabase
        .from("consultas")
        .select(`
          *,
          paciente:pacientes!consultas_paciente_id_fkey(nome),
          local:locais_atendimento(nome_local, cidade, estado)
        `, { count: "exact" })
        .eq("medico_id", medicoData.id)
        .in("status_consulta", ["aguardando", "atendendo"])
        .order("data_hora", { ascending: true });

      // Média de avaliações
      const { data: avaliacoes } = await supabase
        .from("avaliacoes_medico")
        .select("nota")
        .eq("medico_id", medicoData.id);

      const media =
        avaliacoes && avaliacoes.length > 0
          ? avaliacoes.reduce((acc, av) => acc + av.nota, 0) / avaliacoes.length
          : 0;

      // Valor do mês confirmado
      const { data: consultasMes } = await supabase
        .from("consultas")
        .select("valor_medico")
        .eq("medico_id", medicoData.id)
        .eq("status_pagamento", "pago")
        .gte("data_hora", inicioMes.toISOString())
        .lte("data_hora", fimMes.toISOString());

      const valorMes = consultasMes?.reduce((acc, c) => acc + Number(c.valor_medico), 0) || 0;

      // Próximas 5 consultas
      const { data: proximas } = await supabase
        .from("consultas")
        .select(`
          *,
          paciente:pacientes!consultas_paciente_id_fkey(nome),
          local:locais_atendimento(nome_local, cidade, estado)
        `)
        .eq("medico_id", medicoData.id)
        .gte("data_hora", hoje.toISOString())
        .in("status_consulta", ["confirmada", "agendada"])
        .order("data_hora", { ascending: true })
        .limit(5);

      setStats({
        consultasFuturas: futuras || 0,
        consultasHoje: hojeCount || 0,
        mediaAvaliacao: media,
        valorMesConfirmado: valorMes,
        aguardando: aguardandoCount || 0,
      });
      setProximasConsultas(proximas || []);
      setConsultasAguardando(aguardandoData || []);
      setLoading(false);
    }

    fetchData();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [medicoData]);

  const statCards = [
    {
      title: "Aguardando Atendimento",
      value: stats.aguardando,
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      highlight: stats.aguardando > 0,
    },
    {
      title: "Consultas Hoje",
      value: stats.consultasHoje,
      icon: Clock,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Consultas Futuras",
      value: stats.consultasFuturas,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Faturamento do Mês",
      value: `R$ ${stats.valorMesConfirmado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className={`card-shadow hover:shadow-lg transition-shadow ${stat.highlight ? 'ring-2 ring-orange-500' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center ${stat.highlight ? 'animate-pulse' : ''}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pacientes Aguardando */}
      {consultasAguardando.length > 0 && (
        <Card className="card-shadow border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Timer className="w-5 h-5 animate-pulse" />
              Pacientes Aguardando ({consultasAguardando.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consultasAguardando.map((consulta) => (
                <div
                  key={consulta.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-background border border-orange-200 dark:border-orange-900"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold">{consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente"}</p>
                      {consulta.local && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{consulta.local.nome_local}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={consulta.status_consulta === 'atendendo' ? 'bg-purple-500' : 'bg-orange-500'}>
                      {consulta.status_consulta === 'atendendo' ? 'Em Atendimento' : 'Aguardando'}
                    </Badge>
                    {consulta.status_consulta === 'aguardando' && (
                      <div className="flex items-center gap-1 text-sm">
                        <Timer className="w-4 h-4 text-orange-500" />
                        <TempoEspera dataHora={consulta.data_hora} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximas Consultas */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Próximas Consultas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {proximasConsultas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma consulta agendada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {proximasConsultas.map((consulta) => (
                <div
                  key={consulta.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {format(parseISO(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                      {consulta.local && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {consulta.local.nome_local}
                            {consulta.local.cidade && ` - ${consulta.local.cidade}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={consulta.origem === 'interna' ? 'text-emerald-600' : 'text-blue-600'}>
                      {consulta.origem === 'interna' ? 'Interna' : 'Online'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Star, DollarSign, User, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MedicoContext {
  medicoData: any;
}

export default function MedicoDashboard() {
  const { medicoData } = useOutletContext<MedicoContext>();
  const [stats, setStats] = useState({
    consultasFuturas: 0,
    consultasHoje: 0,
    mediaAvaliacao: 0,
    valorMesConfirmado: 0,
  });
  const [proximasConsultas, setProximasConsultas] = useState<any[]>([]);
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
          paciente:pacientes!consultas_paciente_id_fkey(nome)
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
      });
      setProximasConsultas(proximas || []);
      setLoading(false);
    }

    fetchData();
  }, [medicoData]);

  const statCards = [
    {
      title: "Consultas Futuras",
      value: stats.consultasFuturas,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Consultas Hoje",
      value: stats.consultasHoje,
      icon: Clock,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Média de Avaliação",
      value: stats.mediaAvaliacao.toFixed(1),
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      suffix: "/5",
    },
    {
      title: "Receita do Mês",
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
          <Card key={index} className="card-shadow hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stat.value}
                    {stat.suffix && <span className="text-sm text-muted-foreground">{stat.suffix}</span>}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{consulta.origem === 'interna' ? 'Presencial' : 'Online'}</span>
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

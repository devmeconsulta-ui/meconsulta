import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClinicaConsultas() {
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");

  const { data: consultas, isLoading } = useQuery({
    queryKey: ["clinica-consultas", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id,
          data_hora,
          status_consulta,
          status_pagamento,
          valor_consulta,
          nome_paciente_consulta,
          medico:medicos(nome, especialidade),
          paciente:pacientes(nome)
        `)
        .eq("clinica_id", clinicaData.id)
        .order("data_hora", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaData?.id,
  });

  const filteredConsultas = consultas?.filter((c: any) =>
    c.medico?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.paciente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.nome_paciente_consulta?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmada":
        return <Badge className="bg-green-500">Confirmada</Badge>;
      case "aguardando_pagamento":
        return <Badge className="bg-yellow-500">Aguardando Pagamento</Badge>;
      case "cancelada":
        return <Badge variant="destructive">Cancelada</Badge>;
      case "concluida":
        return <Badge className="bg-blue-500">Concluída</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Consultas</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as consultas realizadas na clínica.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por médico ou paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredConsultas?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma consulta encontrada.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultas?.map((consulta: any) => (
                <Card key={consulta.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {consulta.nome_paciente_consulta || consulta.paciente?.nome || "Paciente não informado"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dr(a). {consulta.medico?.nome} • {consulta.medico?.especialidade}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          R$ {consulta.valor_consulta?.toFixed(2)}
                        </span>
                        {getStatusBadge(consulta.status_consulta)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

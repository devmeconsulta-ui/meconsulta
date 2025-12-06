import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, User, Calendar, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface PendingConfirmationsAlertProps {
  pacienteId: string;
}

export function PendingConfirmationsAlert({ pacienteId }: PendingConfirmationsAlertProps) {
  const navigate = useNavigate();
  const [pendingConsultas, setPendingConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingConfirmations();
  }, [pacienteId]);

  async function fetchPendingConfirmations() {
    if (!pacienteId) return;

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("consultas")
      .select(`
        id,
        data_hora,
        status_consulta,
        status_pagamento,
        finalizado_medico,
        finalizado_paciente,
        medicos (id, nome, especialidade, foto_url)
      `)
      .eq("paciente_id", pacienteId)
      .eq("status_pagamento", "pago")
      .in("status_consulta", ["confirmada", "atendida_medico"])
      .eq("finalizado_paciente", false)
      .lt("data_hora", now)
      .order("data_hora", { ascending: false });

    if (!error && data) {
      setPendingConsultas(data);
    }
    setLoading(false);
  }

  if (loading || pendingConsultas.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-amber-700">
                Confirme seus atendimentos
              </p>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                {pendingConsultas.length} pendente{pendingConsultas.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Você tem consultas que precisam da sua confirmação de atendimento
            </p>
            
            <div className="space-y-2">
              {pendingConsultas.slice(0, 3).map((consulta) => (
                <div
                  key={consulta.id}
                  className="flex items-center gap-3 p-2 bg-background rounded-lg border border-border"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {consulta.medicos?.foto_url ? (
                      <img
                        src={consulta.medicos.foto_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Dr(a). {consulta.medicos?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(consulta.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {consulta.finalizado_medico && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs shrink-0">
                      Médico finalizou
                    </Badge>
                  )}
                </div>
              ))}
              
              {pendingConsultas.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  e mais {pendingConsultas.length - 3} consulta(s)...
                </p>
              )}
            </div>
            
            <Button
              size="sm"
              className="mt-3 gap-2"
              onClick={() => navigate("/paciente/consultas")}
            >
              Ver consultas
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

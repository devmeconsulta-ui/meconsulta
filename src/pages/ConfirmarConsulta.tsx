import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
} from "lucide-react";

interface ConsultaData {
  id: string;
  paciente_nome: string;
  medico_nome: string;
  especialidade: string;
  data: string;
  horario: string;
  local: string;
  clinica_nome: string;
  clinica_logo?: string;
  status: string;
}

type PageStatus =
  | "loading"
  | "valid"
  | "confirmed"
  | "declined"
  | "already_confirmed"
  | "already_declined"
  | "expired"
  | "cancelled"
  | "invalid"
  | "error";

export default function ConfirmarConsulta() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<PageStatus>("loading");
  const [consulta, setConsulta] = useState<ConsultaData | null>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchConsultaData();
    }
  }, [token]);

  const fetchConsultaData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "confirmation-response",
        {
          body: null,
          method: "GET",
        }
      );

      // Como invoke não suporta query params, fazemos fetch direto
      const response = await fetch(
        `https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/confirmation-response?token=${token}&action=get`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setStatus(result.status as PageStatus);
        if (result.data) {
          setConsulta(result.data);
        }
        if (result.message) {
          setMessage(result.message);
        }
      } else {
        setStatus(result.status as PageStatus || "error");
        setMessage(result.error || "Erro ao carregar dados");
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
      setStatus("error");
      setMessage("Erro ao conectar com o servidor");
    }
  };

  const handleAction = async (action: "confirm" | "decline") => {
    setIsProcessing(true);
    try {
      const response = await fetch(
        `https://dwqceailivjjacvqzfnh.supabase.co/functions/v1/confirmation-response?token=${token}&action=${action}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setStatus(result.status as PageStatus);
        setMessage(result.message);
      } else {
        setMessage(result.error || "Erro ao processar");
      }
    } catch (error: any) {
      console.error("Erro ao processar ação:", error);
      setMessage("Erro ao conectar com o servidor");
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando dados da consulta...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success states
  if (status === "confirmed" || status === "already_confirmed") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-emerald-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-emerald-800 mb-2 text-center">
              {status === "confirmed" ? "Consulta Confirmada!" : "Já Confirmada"}
            </h1>
            <p className="text-muted-foreground text-center mb-6">
              {status === "confirmed"
                ? "Obrigado por confirmar sua presença. Aguardamos você!"
                : "Esta consulta já foi confirmada anteriormente."}
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 w-full">
              <p className="text-sm text-emerald-700 text-center">
                <strong>Lembrete:</strong> Chegue pelo menos 15 minutos antes do horário agendado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "declined" || status === "already_declined") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-rose-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-rose-800 mb-2 text-center">
              Consulta Cancelada
            </h1>
            <p className="text-muted-foreground text-center mb-6">
              Obrigado por nos avisar. Esperamos poder atendê-lo em breve.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Para reagendar, entre em contato conosco.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (status === "expired" || status === "cancelled" || status === "invalid" || status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
              <AlertTriangle className="h-12 w-12 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-amber-800 mb-2 text-center">
              {status === "expired"
                ? "Link Expirado"
                : status === "cancelled"
                ? "Consulta Cancelada"
                : status === "invalid"
                ? "Link Inválido"
                : "Erro"}
            </h1>
            <p className="text-muted-foreground text-center">
              {message || "Este link não é mais válido. Entre em contato com a clínica."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid state - show confirmation form
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          {consulta?.clinica_logo ? (
            <img
              src={consulta.clinica_logo}
              alt={consulta.clinica_nome}
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <CardTitle className="text-xl">
            {consulta?.clinica_nome || "Confirmação de Consulta"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Dados da consulta */}
          <div className="space-y-4 bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Paciente</p>
                <p className="font-medium">{consulta?.paciente_nome}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Stethoscope className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Médico</p>
                <p className="font-medium">{consulta?.medico_nome}</p>
                {consulta?.especialidade && (
                  <p className="text-sm text-muted-foreground">{consulta.especialidade}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{consulta?.data}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Horário</p>
                <p className="font-medium">{consulta?.horario}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Local</p>
                <p className="font-medium">{consulta?.local}</p>
              </div>
            </div>
          </div>

          {/* Lembrete */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700 text-center">
              <strong>Importante:</strong> Chegue pelo menos 15 minutos antes do horário agendado.
            </p>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Button
              onClick={() => handleAction("confirm")}
              disabled={isProcessing}
              className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-5 w-5 mr-2" />
              )}
              Confirmar Presença
            </Button>

            <Button
              onClick={() => handleAction("decline")}
              disabled={isProcessing}
              variant="outline"
              className="w-full h-14 text-lg border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <XCircle className="h-5 w-5 mr-2" />
              )}
              Não Poderei Comparecer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp, 
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniHeader } from "@/components/clinica/omnichannel/OmniHeader";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

export default function OmniDashboard() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const { atendimentos, loading: loadingAtendimentos } = useOmniAtendimentos(clinicaId);
  const { filas, instancias, loading: loadingFilas } = useOmniFilas(clinicaId);

  const loading = loadingAtendimentos || loadingFilas;

  // Métricas
  const atendimentosHoje = atendimentos.filter(
    (a) => new Date(a.data_abertura).toDateString() === new Date().toDateString()
  );

  const aguardando = atendimentos.filter((a) => a.status === "aguardando");
  const emAtendimento = atendimentos.filter((a) => a.status === "em_atendimento");
  const finalizados = atendimentosHoje.filter((a) => a.status === "finalizado");

  const instanciasConectadas = instancias.filter((i) => i.status === "connected");

  // TMA (Tempo Médio de Atendimento)
  const tmaSegundos = finalizados.reduce((acc, a) => acc + (a.tempo_total_atendimento || 0), 0) / 
    (finalizados.length || 1);
  const tmaMinutos = Math.round(tmaSegundos / 60);

  // TME (Tempo Médio de Espera para primeira resposta)
  const tmeSegundos = finalizados.reduce((acc, a) => acc + (a.tempo_primeira_resposta || 0), 0) / 
    (finalizados.length || 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 -m-6">
      {/* Header com navegação */}
      <OmniHeader />

      <div className="px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do atendimento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={instanciasConectadas.length > 0 ? "default" : "secondary"}>
              {instanciasConectadas.length} instância(s) conectada(s)
            </Badge>
          </div>
        </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aguardando.length}</div>
            <p className="text-xs text-muted-foreground">
              atendimentos na fila
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atendimento</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emAtendimento.length}</div>
            <p className="text-xs text-muted-foreground">
              conversas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalizados Hoje</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{finalizados.length}</div>
            <p className="text-xs text-muted-foreground">
              atendimentos concluídos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TMA</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tmaMinutos} min</div>
            <p className="text-xs text-muted-foreground">
              tempo médio de atendimento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status das Filas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filas de Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            {filas.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma fila configurada
              </p>
            ) : (
              <div className="space-y-3">
                {filas.map((fila) => {
                  const filaAguardando = aguardando.filter((a) => a.fila_id === fila.id).length;
                  const filaAtendendo = emAtendimento.filter((a) => a.fila_id === fila.id).length;

                  return (
                    <div
                      key={fila.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: fila.cor }}
                        />
                        <div>
                          <p className="font-medium">{fila.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {fila.instancia?.status === "connected" ? (
                              <span className="text-green-600">Conectada</span>
                            ) : (
                              <span className="text-muted-foreground">Desconectada</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-yellow-600">{filaAguardando}</p>
                          <p className="text-xs text-muted-foreground">aguardando</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{filaAtendendo}</p>
                          <p className="text-xs text-muted-foreground">atendendo</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {atendimentosHoje.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum atendimento hoje
              </p>
            ) : (
              <div className="space-y-3">
                {atendimentosHoje.slice(0, 5).map((atendimento) => (
                  <div
                    key={atendimento.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {atendimento.contato?.nome || "Contato"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{atendimento.protocolo} • {atendimento.contato?.telefone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          atendimento.status === "aguardando"
                            ? "secondary"
                            : atendimento.status === "em_atendimento"
                            ? "default"
                            : "outline"
                        }
                      >
                        {atendimento.status === "aguardando"
                          ? "Aguardando"
                          : atendimento.status === "em_atendimento"
                          ? "Em Atendimento"
                          : "Finalizado"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(atendimento.data_abertura), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

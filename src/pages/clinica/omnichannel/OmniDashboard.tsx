import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas } from "@/hooks/useOmniFilas";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { OmniDashAtendimentos } from "@/components/clinica/omnichannel/dashboard/OmniDashAtendimentos";
import { OmniDashIntegracoes } from "@/components/clinica/omnichannel/dashboard/OmniDashIntegracoes";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

export default function OmniDashboard() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const [periodo, setPeriodo] = useState("hoje");
  const [filaFilter, setFilaFilter] = useState("todas");
  const [activeTab, setActiveTab] = useState("atendimentos");

  const { atendimentos, mensagens, loading: loadingAtendimentos, refetch } = useOmniAtendimentos(clinicaId);
  const { filas, instancias, loading: loadingFilas } = useOmniFilas(clinicaId);

  const loading = loadingAtendimentos || loadingFilas;

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <OmniLayout>
        <div className="flex items-center justify-center h-[calc(100vh-250px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OmniLayout>
    );
  }

  return (
    <OmniLayout>
      {/* Conteúdo */}
      <div className="space-y-4 sm:space-y-6">
          {/* Tabs e Filtros */}
          <div className="flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="atendimentos" className="flex-1 sm:flex-none sm:px-6 text-xs sm:text-sm">
                  Atendimentos
                </TabsTrigger>
                <TabsTrigger value="integracoes" className="flex-1 sm:flex-none sm:px-6 text-xs sm:text-sm">
                  Integrações
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex gap-3 flex-1">
                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <span className="text-xs text-muted-foreground">Fila</span>
                  <Select value={filaFilter} onValueChange={setFilaFilter}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {filas.map((fila) => (
                        <SelectItem key={fila.id} value={fila.id}>{fila.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                  <span className="text-xs text-muted-foreground">Período</span>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Hoje" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="ontem">Ontem</SelectItem>
                      <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                      <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                      <SelectItem value="mes">Este mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleRefresh} className="w-full sm:w-auto">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === "atendimentos" && (
            <OmniDashAtendimentos 
              atendimentos={atendimentos}
              mensagens={mensagens}
              filas={filas}
              periodo={periodo}
              filaFilter={filaFilter}
            />
          )}

          {activeTab === "integracoes" && (
            <OmniDashIntegracoes 
              instancias={instancias}
              mensagens={mensagens}
              filas={filas}
              periodo={periodo}
              filaFilter={filaFilter}
            />
        )}
      </div>
    </OmniLayout>
  );
}

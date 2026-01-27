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
import { OmniHeader } from "@/components/clinica/omnichannel/OmniHeader";
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
      <div className="space-y-6 -m-6">
        <OmniHeader />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -m-6">
      {/* Header com navegação */}
      <OmniHeader />

      <div className="px-6 pt-4 space-y-6">
        {/* Tabs e Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <TabsList>
              <TabsTrigger value="atendimentos" className="px-6">Atendimentos</TabsTrigger>
              <TabsTrigger value="integracoes" className="px-6">Integrações</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Fila</span>
              <Select value={filaFilter} onValueChange={setFilaFilter}>
                <SelectTrigger className="w-40">
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

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Período</span>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-40">
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

            <Button onClick={handleRefresh} className="mt-5">
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
    </div>
  );
}

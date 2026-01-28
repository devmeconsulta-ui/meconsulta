import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useOmniFilas, OmniFila } from "@/hooks/useOmniFilas";
import { useOmniEtiquetas } from "@/hooks/useOmniEtiquetas";
import { FilaAccordion } from "@/components/clinica/omnichannel/atendimentos/FilaAccordion";
import { VisualizarConversaModal } from "@/components/clinica/omnichannel/atendimentos/VisualizarConversaModal";
import { TransferirAtendimentoModal } from "@/components/clinica/omnichannel/atendimentos/TransferirAtendimentoModal";
import { OmniHeader } from "@/components/clinica/omnichannel/OmniHeader";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string; usuarioClinicaId?: string } | null;
}

export default function OmniAtendimentos() {
  const { clinicaData, currentUser } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>(["aguardando", "em_atendimento"]);
  
  // Modals state
  const [visualizarConversaOpen, setVisualizarConversaOpen] = useState(false);
  const [transferirModalOpen, setTransferirModalOpen] = useState(false);
  const [selectedAtendimento, setSelectedAtendimento] = useState<OmniAtendimento | null>(null);

  const {
    atendimentos,
    loading,
    transferirAtendimento,
    finalizarAtendimento,
  } = useOmniAtendimentos(clinicaId, { status: statusFilters.length > 0 ? statusFilters : undefined });

  const { filas } = useOmniFilas(clinicaId);
  const { etiquetas } = useOmniEtiquetas(clinicaId);

  // Filter atendimentos by search
  const filteredAtendimentos = useMemo(() => {
    if (!searchTerm) return atendimentos;
    const search = searchTerm.toLowerCase();
    return atendimentos.filter((a) =>
      a.contato?.nome?.toLowerCase().includes(search) ||
      a.contato?.telefone?.includes(search) ||
      a.protocolo.toString().includes(search)
    );
  }, [atendimentos, searchTerm]);

  // Group atendimentos by fila
  const atendimentosPorFila = useMemo(() => {
    const grouped: Record<string, OmniAtendimento[]> = {};
    
    // Initialize with all filas
    filas.forEach((fila) => {
      grouped[fila.id] = [];
    });
    
    // Add a "sem fila" group
    grouped["sem_fila"] = [];
    
    filteredAtendimentos.forEach((atendimento) => {
      const filaId = atendimento.fila_id || "sem_fila";
      if (!grouped[filaId]) {
        grouped[filaId] = [];
      }
      grouped[filaId].push(atendimento);
    });
    
    return grouped;
  }, [filteredAtendimentos, filas]);

  // Get agentes from usuarios_clinica with atendimentos count
  const [agentes, setAgentes] = useState<Array<{ id: string; nome: string; atendimentos_count?: number }>>([]);
  
  // Load agentes on mount
  useState(() => {
    const loadAgentes = async () => {
      if (!clinicaId) return;
      
      const { data: usuariosData } = await supabase
        .from("usuarios_clinica")
        .select("id, nome")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);
      
      if (usuariosData) {
        // Count atendimentos per agent
        const { data: atendimentosData } = await supabase
          .from("omni_atendimentos")
          .select("agente_id")
          .eq("clinica_id", clinicaId)
          .in("status", ["aguardando", "em_atendimento"]);
        
        const countByAgent = (atendimentosData || []).reduce((acc, a) => {
          if (a.agente_id) {
            acc[a.agente_id] = (acc[a.agente_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        setAgentes(
          usuariosData.map((u) => ({
            ...u,
            atendimentos_count: countByAgent[u.id] || 0,
          }))
        );
      }
    };
    loadAgentes();
  });

  const handleVisualizarConversa = (atendimento: OmniAtendimento) => {
    setSelectedAtendimento(atendimento);
    setVisualizarConversaOpen(true);
  };

  const handleTransferir = (atendimento: OmniAtendimento) => {
    setSelectedAtendimento(atendimento);
    setTransferirModalOpen(true);
  };

  const handleAlterarEtiqueta = async (atendimento: OmniAtendimento, etiquetaId: string | null) => {
    try {
      const novasEtiquetas = etiquetaId
        ? [...(atendimento.etiquetas || []).filter((e) => e !== etiquetaId), etiquetaId]
        : [];

      await supabase
        .from("omni_atendimentos")
        .update({ etiquetas: novasEtiquetas })
        .eq("id", atendimento.id);

      toast.success(etiquetaId ? "Etiqueta adicionada" : "Etiqueta removida");
    } catch (error) {
      toast.error("Erro ao alterar etiqueta");
    }
  };

  const handleEncerrar = async (atendimento: OmniAtendimento) => {
    await finalizarAtendimento(atendimento.id, "Encerrado pelo agente");
  };

  const handleAbrirTodos = (filaId: string) => {
    toast.info("Funcionalidade em desenvolvimento");
  };

  const handleEncerrarTodos = async (filaId: string) => {
    const atendimentosDaFila = atendimentosPorFila[filaId] || [];
    for (const atendimento of atendimentosDaFila) {
      await finalizarAtendimento(atendimento.id, "Encerramento em massa");
    }
    toast.success(`${atendimentosDaFila.length} atendimentos encerrados`);
  };

  const handleRemoverTravas = (filaId: string) => {
    toast.info("Funcionalidade em desenvolvimento");
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <OmniHeader />
        <div className="flex items-center justify-center h-[calc(100vh-250px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OmniHeader />

      <div className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4" />
                Filtrar
                {statusFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {statusFilters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-3">
                <p className="font-medium text-sm">Status</p>
                {[
                  { value: "aguardando", label: "Aguardando" },
                  { value: "em_atendimento", label: "Em Atendimento" },
                  { value: "finalizado", label: "Finalizado" },
                  { value: "abandonado", label: "Abandonado" },
                ].map((status) => (
                  <div key={status.value} className="flex items-center gap-2">
                    <Checkbox
                      id={status.value}
                      checked={statusFilters.includes(status.value)}
                      onCheckedChange={() => toggleStatusFilter(status.value)}
                    />
                    <Label htmlFor={status.value} className="text-sm cursor-pointer">
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Resumo */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium text-sm sm:text-base">Agendamentos</span>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                {atendimentos.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Filas com acordeão */}
        <div className="space-y-3">
          {filas.map((fila) => (
            <FilaAccordion
              key={fila.id}
              fila={fila}
              atendimentos={atendimentosPorFila[fila.id] || []}
              etiquetas={etiquetas}
              onVisualizarConversa={handleVisualizarConversa}
              onTransferir={handleTransferir}
              onAlterarEtiqueta={handleAlterarEtiqueta}
              onEncerrar={handleEncerrar}
              onAbrirTodos={handleAbrirTodos}
              onEncerrarTodos={handleEncerrarTodos}
              onRemoverTravas={handleRemoverTravas}
            />
          ))}

          {/* Atendimentos sem fila */}
          {atendimentosPorFila["sem_fila"]?.length > 0 && (
            <FilaAccordion
              fila={{ id: "sem_fila", nome: "Sem Fila", cor: "#9CA3AF" }}
              atendimentos={atendimentosPorFila["sem_fila"]}
              etiquetas={etiquetas}
              onVisualizarConversa={handleVisualizarConversa}
              onTransferir={handleTransferir}
              onAlterarEtiqueta={handleAlterarEtiqueta}
              onEncerrar={handleEncerrar}
              onAbrirTodos={handleAbrirTodos}
              onEncerrarTodos={handleEncerrarTodos}
              onRemoverTravas={handleRemoverTravas}
            />
          )}
        </div>

        {filas.length === 0 && atendimentos.length === 0 && (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground text-sm sm:text-base">
                Nenhuma fila ou atendimento encontrado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <VisualizarConversaModal
        open={visualizarConversaOpen}
        onClose={() => {
          setVisualizarConversaOpen(false);
          setSelectedAtendimento(null);
        }}
        atendimento={selectedAtendimento}
        onTransferir={() => {
          setVisualizarConversaOpen(false);
          setTransferirModalOpen(true);
        }}
      />

      <TransferirAtendimentoModal
        open={transferirModalOpen}
        onClose={() => {
          setTransferirModalOpen(false);
          setSelectedAtendimento(null);
        }}
        atendimento={selectedAtendimento}
        filas={filas}
        agentes={agentes}
        onTransferir={transferirAtendimento}
      />
    </div>
  );
}

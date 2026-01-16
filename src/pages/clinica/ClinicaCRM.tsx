import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmClinica, CrmLead, CrmEtapa } from "@/hooks/useCrmClinica";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Settings,
  MoreVertical,
  Target,
  Users,
  DollarSign,
  CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CrmFunilModal from "@/components/clinica/crm/CrmFunilModal";
import CrmEtapaModal from "@/components/clinica/crm/CrmEtapaModal";
import CrmLeadModal from "@/components/clinica/crm/CrmLeadModal";
import CrmLeadCard from "@/components/clinica/crm/CrmLeadCard";
import CrmLeadDetalhesModal from "@/components/clinica/crm/CrmLeadDetalhesModal";

export default function ClinicaCRM() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const clinicaId = currentUser?.clinicaId || null;
  
  const {
    funis,
    funilSelecionado,
    setFunilSelecionado,
    etapas,
    leads,
    estatisticas,
    isLoading,
    moverLead,
    marcarGanho,
    marcarPerdido,
    excluirLead,
  } = useCrmClinica(clinicaId);

  // Modals
  const [funilModalOpen, setFunilModalOpen] = useState(false);
  const [funilParaEditar, setFunilParaEditar] = useState<string | null>(null);
  const [etapaModalOpen, setEtapaModalOpen] = useState(false);
  const [etapaParaEditar, setEtapaParaEditar] = useState<CrmEtapa | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadParaEditar, setLeadParaEditar] = useState<CrmLead | null>(null);
  const [etapaParaNovoLead, setEtapaParaNovoLead] = useState<string | null>(null);
  const [leadDetalhesOpen, setLeadDetalhesOpen] = useState(false);
  const [leadParaDetalhes, setLeadParaDetalhes] = useState<CrmLead | null>(null);
  
  // Drag and drop handler
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return;

    const novaEtapaId = destination.droppableId;
    moverLead(draggableId, novaEtapaId, destination.index, currentUser?.id);
  };

  // Agrupar leads por etapa
  const leadsPorEtapa = etapas.reduce((acc, etapa) => {
    acc[etapa.id] = leads
      .filter(lead => lead.etapa_id === etapa.id)
      .sort((a, b) => a.ordem - b.ordem);
    return acc;
  }, {} as Record<string, CrmLead[]>);

  const funilAtual = funis.find(f => f.id === funilSelecionado);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-10 md:h-12 w-full" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[400px] md:h-[600px] w-full md:w-80 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 h-[calc(100vh-80px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        {/* Title + Funnel Select + Config */}
        <div className="flex items-center gap-2 md:gap-4">
          <h1 className="text-lg md:text-2xl font-bold text-foreground">CRM</h1>
          
          <Select
            value={funilSelecionado || ""}
            onValueChange={setFunilSelecionado}
          >
            <SelectTrigger className="flex-1 md:w-[200px] md:flex-none h-9 text-sm">
              <SelectValue placeholder="Selecione funil" />
            </SelectTrigger>
            <SelectContent>
              {funis.map(funil => (
                <SelectItem key={funil.id} value={funil.id}>
                  {funil.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFunilModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funil
              </DropdownMenuItem>
              {funilAtual && (
                <>
                  <DropdownMenuItem onClick={() => {
                    setFunilParaEditar(funilAtual.id);
                    setFunilModalOpen(true);
                  }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar Funil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEtapaModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Etapa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats - Compact on mobile */}
        {funilSelecionado && (
          <div className="flex items-center gap-4 text-xs md:text-sm">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              <span className="font-semibold">{estatisticas.totalLeads}</span>
              <span className="text-muted-foreground hidden sm:inline">leads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
              <span className="font-semibold">
                R$ {estatisticas.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      {!funilSelecionado ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Users className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mb-4" />
          <h2 className="text-lg md:text-xl font-semibold mb-2">Nenhum funil selecionado</h2>
          <p className="text-sm md:text-base text-muted-foreground mb-4">
            Crie seu primeiro funil para começar
          </p>
          <Button onClick={() => setFunilModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Criar Funil
          </Button>
        </div>
      ) : (
        /* ===== KANBAN - Horizontal scroll for all screen sizes ===== */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div 
            className="flex-1 overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            style={{ 
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className="flex gap-3 md:gap-4 h-full">
              {etapas.map((etapa, index) => (
                <div
                  key={etapa.id}
                  className="flex flex-col w-[280px] md:w-80 flex-shrink-0 bg-muted/30 rounded-xl"
                >
                  {/* Column Header */}
                  <div
                    className="p-2.5 md:p-3 border-b flex items-center justify-between rounded-t-xl"
                    style={{ borderTop: `3px solid ${etapa.cor}` }}
                  >
                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: etapa.cor }}
                      />
                      <h3 className="font-semibold text-xs md:text-sm truncate">{etapa.nome}</h3>
                      <Badge variant="secondary" className="text-[10px] md:text-xs px-1.5">
                        {leadsPorEtapa[etapa.id]?.length || 0}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background z-50">
                          <DropdownMenuItem onClick={() => {
                            setEtapaParaEditar(etapa);
                            setEtapaModalOpen(true);
                          }}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configurar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {etapa.pode_criar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate("/clinica/agenda")}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Column Stats */}
                  <div className="px-2.5 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs text-muted-foreground border-b">
                    R$ {(estatisticas.leadsPorEtapa[index]?.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={etapa.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-2 space-y-2 overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
                          snapshot.isDraggingOver && "bg-primary/5"
                        )}
                        style={{ maxHeight: 'calc(100vh - 280px)' }}
                      >
                        {leadsPorEtapa[etapa.id]?.map((lead, leadIndex) => (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={leadIndex}
                          >
                            {(provided, snapshot) => (
                              <CrmLeadCard
                                lead={lead}
                                isDragging={snapshot.isDragging}
                                onClick={() => {
                                  setLeadParaDetalhes(lead);
                                  setLeadDetalhesOpen(true);
                                }}
                                onQuickGanho={() => marcarGanho.mutate(lead.id)}
                                onQuickPerdido={() => marcarPerdido.mutate({ id: lead.id })}
                                innerRef={provided.innerRef}
                                draggableProps={provided.draggableProps}
                                dragHandleProps={provided.dragHandleProps}
                              />
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {/* Empty state */}
                        {(!leadsPorEtapa[etapa.id] || leadsPorEtapa[etapa.id].length === 0) && (
                          <div className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
                            Nenhum lead
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}

              {/* Add Column Button */}
              <div className="flex-shrink-0 w-[280px] md:w-80">
                <Button
                  variant="ghost"
                  className="w-full h-12 border-2 border-dashed"
                  onClick={() => setEtapaModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-xs md:text-sm">Adicionar Etapa</span>
                </Button>
              </div>
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Modals */}
      <CrmFunilModal
        open={funilModalOpen}
        onOpenChange={(open) => {
          setFunilModalOpen(open);
          if (!open) setFunilParaEditar(null);
        }}
        funilId={funilParaEditar}
        clinicaId={clinicaId}
      />

      <CrmEtapaModal
        open={etapaModalOpen}
        onOpenChange={(open) => {
          setEtapaModalOpen(open);
          if (!open) setEtapaParaEditar(null);
        }}
        etapa={etapaParaEditar}
        funilId={funilSelecionado}
      />

      <CrmLeadModal
        open={leadModalOpen}
        onOpenChange={(open) => {
          setLeadModalOpen(open);
          if (!open) {
            setLeadParaEditar(null);
            setEtapaParaNovoLead(null);
          }
        }}
        lead={leadParaEditar}
        etapaId={etapaParaNovoLead}
        clinicaId={clinicaId}
        funilId={funilSelecionado}
        onGanho={(id) => marcarGanho.mutate(id)}
        onPerdido={(id, motivo) => marcarPerdido.mutate({ id, motivo })}
        onExcluir={(id) => excluirLead.mutate(id)}
      />

      <CrmLeadDetalhesModal
        open={leadDetalhesOpen}
        onOpenChange={(open) => {
          setLeadDetalhesOpen(open);
          if (!open) setLeadParaDetalhes(null);
        }}
        lead={leadParaDetalhes}
        onGanho={(id) => marcarGanho.mutate(id)}
        onPerdido={(id) => marcarPerdido.mutate({ id })}
        onAgendar={() => navigate("/clinica/agenda")}
      />
    </div>
  );
}

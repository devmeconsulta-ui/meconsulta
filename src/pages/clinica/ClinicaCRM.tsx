import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmClinica, CrmLead, CrmEtapa } from "@/hooks/useCrmClinica";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Calendar,
  DollarSign,
  GripVertical,
  Target,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import CrmFunilModal from "@/components/clinica/crm/CrmFunilModal";
import CrmEtapaModal from "@/components/clinica/crm/CrmEtapaModal";
import CrmLeadModal from "@/components/clinica/crm/CrmLeadModal";

export default function ClinicaCRM() {
  const { currentUser } = useAuth();
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
  
  // Mobile state
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentEtapaIndex, setCurrentEtapaIndex] = useState(0);

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

  // Mobile swipe detection - update dots indicator
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const columnWidth = container.offsetWidth;
      const newIndex = Math.round(scrollLeft / columnWidth);
      if (newIndex !== currentEtapaIndex && newIndex >= 0 && newIndex < etapas.length) {
        setCurrentEtapaIndex(newIndex);
      }
    };
    
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isMobile, etapas.length, currentEtapaIndex]);

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
    <div className="p-3 md:p-6 h-full flex flex-col">
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
      ) : isMobile ? (
        /* ===== MOBILE VIEW: Horizontal swipe between stages ===== */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 flex flex-col min-h-0">
            {/* Swipeable columns container */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
              style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex h-full" style={{ width: `${(etapas.length + 1) * 100}%` }}>
                {etapas.map((etapa, index) => (
                  <div
                    key={etapa.id}
                    className="snap-center flex-shrink-0 h-full px-1"
                    style={{ width: `${100 / (etapas.length + 1)}%` }}
                  >
                    <div className="flex flex-col bg-muted/30 rounded-xl h-full">
                      {/* Stage Header */}
                      <div
                        className="p-3 border-b flex items-center justify-between rounded-t-xl"
                        style={{ borderTop: `3px solid ${etapa.cor}` }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: etapa.cor }}
                          />
                          <h3 className="font-semibold text-sm truncate">{etapa.nome}</h3>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {leadsPorEtapa[etapa.id]?.length || 0}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
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
                              onClick={() => {
                                setEtapaParaNovoLead(etapa.id);
                                setLeadModalOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Stage Stats */}
                      <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                        R$ {(estatisticas.leadsPorEtapa[index]?.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>

                      {/* Lead Cards */}
                      <Droppable droppableId={etapa.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "flex-1 p-2 space-y-2 overflow-y-auto transition-colors",
                              snapshot.isDraggingOver && "bg-primary/5"
                            )}
                          >
                            {leadsPorEtapa[etapa.id]?.map((lead, leadIndex) => (
                              <Draggable
                                key={lead.id}
                                draggableId={lead.id}
                                index={leadIndex}
                              >
                                {(provided, snapshot) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "p-3 cursor-pointer active:scale-[0.98] transition-all",
                                      snapshot.isDragging && "shadow-lg"
                                    )}
                                    onClick={() => {
                                      setLeadParaEditar(lead);
                                      setLeadModalOpen(true);
                                    }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-1.5">
                                          <div className="min-w-0 flex-1">
                                            {lead.responsavel?.nome && (
                                              <span className="text-[10px] text-muted-foreground">
                                                {lead.responsavel.nome}
                                              </span>
                                            )}
                                            <h4 className="font-medium text-sm truncate">
                                              {lead.nome}
                                            </h4>
                                          </div>
                                          
                                          {lead.origem === "online" && (
                                            <Badge variant="default" className="text-[9px] px-1 py-0 ml-2">
                                              Online
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                          {lead.data_vencimento ? (
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                              <Calendar className="h-3 w-3" />
                                              {format(new Date(lead.data_vencimento), "dd/MM", { locale: ptBR })}
                                            </div>
                                          ) : (
                                            <span className="text-[10px] text-muted-foreground">Sem vencimento</span>
                                          )}
                                          
                                          <div className="flex items-center gap-1">
                                            {lead.valor_estimado > 0 && (
                                              <Badge variant="outline" className="text-[9px] h-4 px-1">
                                                R$ {lead.valor_estimado.toLocaleString("pt-BR")}
                                              </Badge>
                                            )}
                                            {lead.observacoes && (
                                              <span className="text-[10px]">📝</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            
                            {/* Empty state */}
                            {(!leadsPorEtapa[etapa.id] || leadsPorEtapa[etapa.id].length === 0) && (
                              <div className="text-center py-8 text-muted-foreground text-sm">
                                Nenhum lead
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                ))}
                
                {/* Add new stage column */}
                <div
                  className="snap-center flex-shrink-0 h-full px-1"
                  style={{ width: `${100 / (etapas.length + 1)}%` }}
                >
                  <div 
                    className="flex flex-col items-center justify-center bg-muted/20 rounded-xl h-full border-2 border-dashed border-muted-foreground/20 cursor-pointer"
                    onClick={() => setEtapaModalOpen(true)}
                  >
                    <Plus className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <span className="text-sm text-muted-foreground">Nova Etapa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-1.5 py-3">
              {etapas.map((etapa, index) => (
                <div
                  key={etapa.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    currentEtapaIndex === index ? "w-4" : "opacity-40"
                  )}
                  style={{ backgroundColor: etapa.cor }}
                />
              ))}
              <div
                className={cn(
                  "w-2 h-2 rounded-full bg-muted-foreground transition-all",
                  currentEtapaIndex === etapas.length ? "w-4" : "opacity-40"
                )}
              />
            </div>
          </div>
        </DragDropContext>
      ) : (
        /* ===== DESKTOP VIEW: Multi-column Kanban ===== */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-4 h-full min-h-[600px] pb-4">
              {etapas.map((etapa, index) => (
                <div
                  key={etapa.id}
                  className="flex flex-col w-80 flex-shrink-0 bg-muted/30 rounded-xl"
                >
                  {/* Column Header */}
                  <div
                    className="p-3 border-b flex items-center justify-between"
                    style={{ borderTopColor: etapa.cor, borderTopWidth: 3 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: etapa.cor }}
                      />
                      <h3 className="font-semibold text-sm">{etapa.nome}</h3>
                      <Badge variant="secondary" className="ml-1">
                        {leadsPorEtapa[etapa.id]?.length || 0}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEtapaParaEditar(etapa);
                            setEtapaModalOpen(true);
                          }}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configurar Etapa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {etapa.pode_criar && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEtapaParaNovoLead(etapa.id);
                            setLeadModalOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Column Stats */}
                  <div className="px-3 py-2 text-xs text-muted-foreground flex gap-4 border-b">
                    <span>
                      R$ {(estatisticas.leadsPorEtapa[index]?.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={etapa.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-2 space-y-2 overflow-y-auto transition-colors",
                          snapshot.isDraggingOver && "bg-primary/5"
                        )}
                      >
                        {leadsPorEtapa[etapa.id]?.map((lead, leadIndex) => (
                          <Draggable
                            key={lead.id}
                            draggableId={lead.id}
                            index={leadIndex}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  "p-3 cursor-pointer hover:shadow-md transition-all",
                                  snapshot.isDragging && "shadow-lg rotate-2"
                                )}
                                onClick={() => {
                                  setLeadParaEditar(lead);
                                  setLeadModalOpen(true);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="mt-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        {lead.responsavel?.nome && (
                                          <span className="text-xs text-muted-foreground">
                                            {lead.responsavel.nome}
                                          </span>
                                        )}
                                        <h4 className="font-medium text-sm truncate">
                                          {lead.nome}
                                        </h4>
                                      </div>
                                      
                                      {lead.origem === "online" && (
                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                          Online
                                        </Badge>
                                      )}
                                    </div>

                                    {lead.data_vencimento ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(lead.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground mb-2">
                                        Sem vencimento
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        {lead.valor_estimado > 0 && (
                                          <Badge variant="outline" className="text-[10px]">
                                            R$ {lead.valor_estimado.toLocaleString("pt-BR")}
                                          </Badge>
                                        )}
                                        {lead.observacoes && (
                                          <Badge variant="secondary" className="text-[10px]">
                                            📝
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}

              {/* Add Column Button */}
              <div className="flex-shrink-0 w-80">
                <Button
                  variant="ghost"
                  className="w-full h-12 border-2 border-dashed"
                  onClick={() => setEtapaModalOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Etapa
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
    </div>
  );
}

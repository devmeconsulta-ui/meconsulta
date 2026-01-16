import { useState } from "react";
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
  User,
  Calendar,
  Phone,
  DollarSign,
  TrendingUp,
  FileDown,
  ChevronRight,
  GripVertical,
  Target,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[600px] w-80 flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          
          <Select
            value={funilSelecionado || ""}
            onValueChange={setFunilSelecionado}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um funil" />
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
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
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

        {/* Stats */}
        {funilSelecionado && (
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-semibold">{estatisticas.totalLeads}</span>
              <span className="text-muted-foreground">leads</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="font-semibold">
                R$ {estatisticas.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-muted-foreground">valor total</span>
            </div>
          </div>
        )}
      </div>

      {/* Board */}
      {!funilSelecionado ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum funil selecionado</h2>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro funil para começar a gerenciar seus leads
          </p>
          <Button onClick={() => setFunilModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Funil
          </Button>
        </div>
      ) : (
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
                                    {/* Lead Info */}
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

                                    {/* Vencimento */}
                                    {lead.data_vencimento && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(lead.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                                      </div>
                                    )}
                                    
                                    {!lead.data_vencimento && (
                                      <div className="text-xs text-muted-foreground mb-2">
                                        Sem vencimento
                                      </div>
                                    )}

                                    {/* Tags and Value */}
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

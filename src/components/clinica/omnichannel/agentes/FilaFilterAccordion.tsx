import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  X, 
  Users, 
  MessageCircle, 
  Smile,
  Settings,
  MoreHorizontal,
  ArrowRightLeft,
  Eye,
  Tag,
  XCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniFila } from "@/hooks/useOmniFilas";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";

interface FilaFilterAccordionProps {
  filas: OmniFila[];
  atendimentos: OmniAtendimento[];
  selectedFilas: string[];
  onToggleFila: (filaId: string) => void;
  onClearFilters: () => void;
  onTransferir?: (atendimento: OmniAtendimento) => void;
  onVisualizarConversa?: (atendimento: OmniAtendimento) => void;
  onEncerrar?: (atendimento: OmniAtendimento) => void;
}

export function FilaFilterAccordion({
  filas,
  atendimentos,
  selectedFilas,
  onToggleFila,
  onClearFilters,
  onTransferir,
  onVisualizarConversa,
  onEncerrar,
}: FilaFilterAccordionProps) {
  const [expandedFilas, setExpandedFilas] = useState<string[]>([]);

  const toggleExpanded = (filaId: string) => {
    setExpandedFilas((prev) =>
      prev.includes(filaId)
        ? prev.filter((id) => id !== filaId)
        : [...prev, filaId]
    );
  };

  const formatTimeAgo = (date: string | null) => {
    if (!date) return "N/A";
    return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: false });
  };

  return (
    <div className="w-72 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="w-4 h-4" />
          <span>Filtrar</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearFilters}
          className="h-6 w-6"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Accordion Items */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filas.map((fila) => {
            const filaAtendimentos = atendimentos.filter(
              (a) => a.fila_id === fila.id && a.status !== "finalizado"
            );
            const count = filaAtendimentos.length;
            const isExpanded = expandedFilas.includes(fila.id);
            
            // Calculate stats
            const agentesUnicos = new Set(
              filaAtendimentos.filter((a) => a.agente_id).map((a) => a.agente_id)
            ).size;
            const satisfacaoMedia = filaAtendimentos.length > 0
              ? filaAtendimentos
                  .filter((a) => a.avaliacao_nota)
                  .reduce((acc, a) => acc + (a.avaliacao_nota || 0), 0) /
                  (filaAtendimentos.filter((a) => a.avaliacao_nota).length || 1)
              : 0;

            return (
              <Collapsible
                key={fila.id}
                open={isExpanded}
                onOpenChange={() => toggleExpanded(fila.id)}
              >
                {/* Fila Header */}
                <div className="rounded-lg border bg-background">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: fila.cor }}
                        />
                        <span className="text-sm font-medium truncate">
                          {fila.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded text-xs font-medium bg-muted text-muted-foreground">
                          {count}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Expanded Content */}
                  <CollapsibleContent>
                    {/* Stats Row */}
                    <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{agentesUnicos}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Smile className="w-3.5 h-3.5" />
                          <span>{satisfacaoMedia.toFixed(1)}</span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Settings className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-[100]">
                          <DropdownMenuItem>Abrir todos</DropdownMenuItem>
                          <DropdownMenuItem>Remover bloqueios</DropdownMenuItem>
                          <DropdownMenuItem>Fechar todos</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Atendimentos List */}
                    <div className="max-h-64 overflow-y-auto">
                      {filaAtendimentos.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhum atendimento
                        </p>
                      ) : (
                        filaAtendimentos.map((atendimento) => (
                          <div
                            key={atendimento.id}
                            className="flex items-center justify-between px-3 py-2.5 border-t hover:bg-muted/30 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {atendimento.contato?.nome || "Contato"}
                                </p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span>⏱</span>
                                  {formatTimeAgo(atendimento.data_abertura)}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  size="icon" 
                                  className="h-7 w-7 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-900 shrink-0"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 z-[100] bg-popover border shadow-lg">
                                <DropdownMenuItem onClick={() => onTransferir?.(atendimento)}>
                                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                                  Transferir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onVisualizarConversa?.(atendimento)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualizar conversa
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Tag className="w-4 h-4 mr-2" />
                                  Alterar etiqueta
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => onEncerrar?.(atendimento)}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Encerrar atendimento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {filas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma fila configurada
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

import { CrmLead } from "@/hooks/useCrmClinica";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Phone, Calendar, Clock, Check, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface CrmLeadCardProps {
  lead: CrmLead;
  isDragging?: boolean;
  onClick: () => void;
  onQuickGanho?: () => void;
  onQuickPerdido?: () => void;
  dragHandleProps?: any;
  innerRef?: any;
  draggableProps?: any;
}

export default function CrmLeadCard({
  lead,
  isDragging,
  onClick,
  onQuickGanho,
  onQuickPerdido,
  dragHandleProps,
  innerRef,
  draggableProps,
}: CrmLeadCardProps) {
  // Calcular "Há X dias"
  const diasDesdeCreation = formatDistanceToNow(new Date(lead.created_at), {
    locale: ptBR,
    addSuffix: false,
  });

  // Usar telefone do paciente se disponível, senão usar do lead
  const telefone = lead.paciente?.telefone || lead.telefone;
  
  // Usar valor da consulta se disponível, senão usar valor estimado
  const valor = lead.consulta?.valor_consulta || lead.valor_estimado || 0;

  // Status da consulta formatado
  const getStatusConsulta = (status: string | undefined) => {
    if (!status) return null;
    const statusMap: Record<string, { label: string; color: string }> = {
      agendada: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
      aguardando_pagamento: { label: "Aguard. Pag.", color: "bg-amber-100 text-amber-700" },
      confirmada: { label: "Confirmado", color: "bg-green-100 text-green-700" },
      aguardando: { label: "Aguardando", color: "bg-purple-100 text-purple-700" },
      atendendo: { label: "Atendendo", color: "bg-pink-100 text-pink-700" },
      concluida: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
      atendida_medico: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
      cancelada: { label: "Cancelado", color: "bg-red-100 text-red-700" },
      nao_compareceu: { label: "Faltou", color: "bg-gray-100 text-gray-700" },
    };
    return statusMap[status] || null;
  };

  const statusInfo = getStatusConsulta(lead.consulta?.status_consulta);

  return (
    <Card
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className={cn(
        "p-2.5 md:p-3 cursor-pointer active:scale-[0.98] hover:shadow-md transition-all group",
        isDragging && "shadow-lg rotate-1 ring-2 ring-primary/20"
      )}
      onClick={onClick}
    >
      {/* Header: Responsável + Ações rápidas */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1 min-w-0">
          {lead.responsavel?.nome ? (
            <span className="text-[9px] md:text-[10px] text-muted-foreground block truncate">
              {lead.responsavel.nome}
            </span>
          ) : (
            <span className="text-[9px] md:text-[10px] text-orange-500 block">
              Sem responsável
            </span>
          )}
          <h4 className="font-medium text-xs md:text-sm truncate leading-tight">
            {lead.paciente?.nome || lead.nome}
          </h4>
        </div>
        
        {/* Ações rápidas (aparecem no hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          {onQuickGanho && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                onQuickGanho();
              }}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          {onQuickPerdido && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onQuickPerdido();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Origem Badge */}
      <div className="flex items-center gap-1 mb-1.5">
        {lead.origem === "online" && (
          <Badge className="text-[8px] md:text-[9px] px-1 py-0 bg-blue-500 hover:bg-blue-500">
            Online
          </Badge>
        )}
        {lead.origem === "manual" && (
          <Badge variant="secondary" className="text-[8px] md:text-[9px] px-1 py-0">
            Manual
          </Badge>
        )}
        {statusInfo && (
          <Badge className={cn("text-[8px] md:text-[9px] px-1 py-0", statusInfo.color)}>
            {statusInfo.label}
          </Badge>
        )}
      </div>

      {/* Telefone */}
      {telefone && (
        <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-muted-foreground mb-1">
          <Phone className="h-2.5 w-2.5 md:h-3 md:w-3" />
          <span className="truncate">{telefone}</span>
        </div>
      )}

      {/* Valor + Data */}
      <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-muted-foreground mb-1.5">
        {valor > 0 && (
          <span className="font-medium">
            R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        )}
        {lead.consulta?.data_hora && (
          <div className="flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(lead.consulta.data_hora), "dd/MM/yy HH:mm", { locale: ptBR })}
          </div>
        )}
      </div>

      {/* Há X dias + Vencimento */}
      <div className="flex items-center justify-between text-[8px] md:text-[9px] text-muted-foreground">
        <div className="flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" />
          <span>Há {diasDesdeCreation}</span>
        </div>
        
        <span className={cn(
          lead.data_vencimento ? "text-muted-foreground" : "text-muted-foreground/60"
        )}>
          {lead.data_vencimento 
            ? format(new Date(lead.data_vencimento), "dd/MM", { locale: ptBR })
            : "Sem vencimento"
          }
        </span>
      </div>

      {/* Indicadores extras */}
      <div className="flex items-center gap-1 mt-1.5">
        {lead.observacoes && (
          <span className="text-[9px]" title="Tem observações">📝</span>
        )}
        {lead.tags && lead.tags.length > 0 && (
          <span className="text-[9px]" title={lead.tags.join(", ")}>🏷️</span>
        )}
        {lead.consulta?.medico?.nome && (
          <span className="text-[8px] text-muted-foreground truncate" title={lead.consulta.medico.nome}>
            Dr. {lead.consulta.medico.nome.split(" ")[0]}
          </span>
        )}
      </div>
    </Card>
  );
}
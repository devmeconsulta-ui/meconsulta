import { CrmLead } from "@/hooks/useCrmClinica";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  DollarSign, 
  Globe, 
  Building2,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CrmLeadDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  onGanho?: (id: string) => void;
  onPerdido?: (id: string) => void;
  onAgendar?: (lead: CrmLead) => void;
}

export default function CrmLeadDetalhesModal({
  open,
  onOpenChange,
  lead,
  onGanho,
  onPerdido,
  onAgendar,
}: CrmLeadDetalhesModalProps) {
  if (!lead) return null;

  const isVirtual = lead.id.startsWith("virtual-");
  const paciente = lead.paciente;
  const consulta = lead.consulta;

  const getStatusInfo = (status: string | undefined) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      agendada: { label: "Agendado", color: "bg-blue-100 text-blue-700" },
      aguardando_pagamento: { label: "Aguardando Pagamento", color: "bg-amber-100 text-amber-700" },
      confirmada: { label: "Confirmado", color: "bg-green-100 text-green-700" },
      aguardando: { label: "Aguardando Atendimento", color: "bg-purple-100 text-purple-700" },
      atendendo: { label: "Em Atendimento", color: "bg-pink-100 text-pink-700" },
      concluida: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
      atendida_medico: { label: "Concluído", color: "bg-emerald-100 text-emerald-700" },
    };
    return statusMap[status || ""] || null;
  };

  const statusInfo = getStatusInfo(consulta?.status_consulta);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes do Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges de origem e status */}
          <div className="flex flex-wrap gap-2">
            {lead.origem === "online" ? (
              <Badge className="bg-blue-500 hover:bg-blue-600">
                <Globe className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Building2 className="h-3 w-3 mr-1" />
                Interno
              </Badge>
            )}
            {statusInfo && (
              <Badge className={cn(statusInfo.color)}>
                {statusInfo.label}
              </Badge>
            )}
            {isVirtual && (
              <Badge variant="outline" className="text-xs">
                Auto-gerado
              </Badge>
            )}
          </div>

          {/* Dados do Paciente */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Paciente
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Nome</span>
                <p className="font-medium">{paciente?.nome || lead.nome}</p>
              </div>
              {paciente?.cpf && (
                <div>
                  <span className="text-muted-foreground text-xs">CPF</span>
                  <p className="font-medium">{paciente.cpf}</p>
                </div>
              )}
              {(paciente?.telefone || lead.telefone) && (
                <div>
                  <span className="text-muted-foreground text-xs">Telefone</span>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <a 
                      href={`tel:${paciente?.telefone || lead.telefone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {paciente?.telefone || lead.telefone}
                    </a>
                  </div>
                </div>
              )}
              {lead.email && (
                <div>
                  <span className="text-muted-foreground text-xs">Email</span>
                  <p className="font-medium truncate">{lead.email}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Dados da Consulta */}
          {consulta && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Consulta
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Data</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <p className="font-medium">
                        {format(new Date(consulta.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Horário</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="font-medium">
                        {format(new Date(consulta.data_hora), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {consulta.medico && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs">Médico</span>
                      <p className="font-medium">
                        Dr(a). {consulta.medico.nome}
                        {consulta.medico.especialidade && (
                          <span className="text-muted-foreground text-xs ml-1">
                            • {consulta.medico.especialidade}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground text-xs">Valor</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-green-600" />
                      <p className="font-medium text-green-600">
                        R$ {consulta.valor_consulta?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Informações do Lead */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informações
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Criado há</span>
                <p className="font-medium">
                  {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: false })}
                </p>
              </div>
              {lead.valor_estimado > 0 && !consulta && (
                <div>
                  <span className="text-muted-foreground text-xs">Valor Estimado</span>
                  <p className="font-medium text-green-600">
                    R$ {lead.valor_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              {lead.responsavel?.nome && (
                <div>
                  <span className="text-muted-foreground text-xs">Responsável</span>
                  <p className="font-medium">{lead.responsavel.nome}</p>
                </div>
              )}
              {lead.data_vencimento && (
                <div>
                  <span className="text-muted-foreground text-xs">Vencimento</span>
                  <p className="font-medium">
                    {format(new Date(lead.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div>
                <span className="text-muted-foreground text-xs">Tags</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {lead.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {lead.observacoes && (
              <div>
                <span className="text-muted-foreground text-xs flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Observações
                </span>
                <p className="text-sm mt-1 p-2 bg-muted/50 rounded-md">
                  {lead.observacoes}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {!isVirtual && onGanho && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onGanho(lead.id);
                  onOpenChange(false);
                }}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Marcar como Ganho
              </Button>
            )}
            {!isVirtual && onPerdido && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => {
                  onPerdido(lead.id);
                  onOpenChange(false);
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Marcar como Perdido
              </Button>
            )}
            {onAgendar && !consulta && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  onAgendar(lead);
                  onOpenChange(false);
                }}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Agendar Consulta
              </Button>
            )}
            {(paciente?.telefone || lead.telefone) && (
              <Button 
                size="sm" 
                variant="outline"
                asChild
              >
                <a 
                  href={`https://wa.me/55${(paciente?.telefone || lead.telefone)?.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

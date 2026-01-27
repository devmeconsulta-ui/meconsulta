import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Users,
  MessageCircle,
  Smile,
  Settings,
  MoreHorizontal,
  Clock,
  MessageSquare,
  ArrowRightLeft,
  Tag,
  XCircle,
  Unlock,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { OmniAtendimento } from "@/hooks/useOmniAtendimentos";

interface FilaAccordionProps {
  fila: {
    id: string;
    nome: string;
    cor: string;
  };
  atendimentos: OmniAtendimento[];
  etiquetas: Array<{ id: string; nome: string; cor: string }>;
  onVisualizarConversa: (atendimento: OmniAtendimento) => void;
  onTransferir: (atendimento: OmniAtendimento) => void;
  onAlterarEtiqueta: (atendimento: OmniAtendimento, etiquetaId: string | null) => void;
  onEncerrar: (atendimento: OmniAtendimento) => void;
  onAbrirTodos: (filaId: string) => void;
  onEncerrarTodos: (filaId: string) => void;
  onRemoverTravas: (filaId: string) => void;
}

function AtendimentoItem({
  atendimento,
  etiquetas,
  onVisualizarConversa,
  onTransferir,
  onAlterarEtiqueta,
  onEncerrar,
}: {
  atendimento: OmniAtendimento;
  etiquetas: Array<{ id: string; nome: string; cor: string }>;
  onVisualizarConversa: (atendimento: OmniAtendimento) => void;
  onTransferir: (atendimento: OmniAtendimento) => void;
  onAlterarEtiqueta: (atendimento: OmniAtendimento, etiquetaId: string | null) => void;
  onEncerrar: (atendimento: OmniAtendimento) => void;
}) {
  const tempoEspera = formatDistanceToNow(new Date(atendimento.data_abertura), {
    addSuffix: false,
    locale: ptBR,
  });

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/50 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">
            {atendimento.contato?.nome || "Desconhecido"}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{tempoEspera}</span>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => onTransferir(atendimento)}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Transferir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onVisualizarConversa(atendimento)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Visualizar conversa
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag className="h-4 w-4 mr-2" />
              Alterar etiqueta
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onAlterarEtiqueta(atendimento, null)}>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Limpar etiqueta</p>
                    <p className="text-xs text-muted-foreground">
                      Remover etiqueta do atendim...
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {etiquetas.map((etiqueta) => (
                <DropdownMenuItem
                  key={etiqueta.id}
                  onClick={() => onAlterarEtiqueta(atendimento, etiqueta.id)}
                >
                  <div
                    className="w-full py-1 px-2 rounded text-white text-sm font-medium"
                    style={{ backgroundColor: etiqueta.cor }}
                  >
                    {etiqueta.nome}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-muted-foreground">
            <Unlock className="h-4 w-4 mr-2" />
            Remover trava
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="text-muted-foreground">
            <UserMinus className="h-4 w-4 mr-2" />
            Remover da sala de espera
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onEncerrar(atendimento)}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Encerrar atendimento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FilaAccordion({
  fila,
  atendimentos,
  etiquetas,
  onVisualizarConversa,
  onTransferir,
  onAlterarEtiqueta,
  onEncerrar,
  onAbrirTodos,
  onEncerrarTodos,
  onRemoverTravas,
}: FilaAccordionProps) {
  const [isOpen, setIsOpen] = useState(true);

  const stats = {
    agentes: new Set(atendimentos.filter(a => a.agente_id).map(a => a.agente_id)).size,
    mensagens: atendimentos.length,
    satisfacao: 0,
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: fila.cor }}
          />
          <span className="font-medium truncate max-w-[180px]" title={fila.nome}>
            {fila.nome}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mr-2">
          <div className="flex items-center gap-1" title="Agentes">
            <Users className="h-4 w-4" />
            <span>{stats.agentes}</span>
          </div>
          <div className="flex items-center gap-1" title="Atendimentos">
            <MessageCircle className="h-4 w-4" />
            <span>{atendimentos.length}</span>
          </div>
          <div className="flex items-center gap-1" title="Satisfação">
            <Smile className="h-4 w-4" />
            <span>{stats.satisfacao.toFixed(1)}</span>
          </div>
        </div>

        {/* Fila Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAbrirTodos(fila.id)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Abrir atendimentos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRemoverTravas(fila.id)}>
              <Unlock className="h-4 w-4 mr-2" />
              Remover todas as travas
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEncerrarTodos(fila.id)}
              className="text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Encerrar todos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="divide-y">
          {atendimentos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhum atendimento nesta fila
            </div>
          ) : (
            atendimentos.map((atendimento) => (
              <AtendimentoItem
                key={atendimento.id}
                atendimento={atendimento}
                etiquetas={etiquetas}
                onVisualizarConversa={onVisualizarConversa}
                onTransferir={onTransferir}
                onAlterarEtiqueta={onAlterarEtiqueta}
                onEncerrar={onEncerrar}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

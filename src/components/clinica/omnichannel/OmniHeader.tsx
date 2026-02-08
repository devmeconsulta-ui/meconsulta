import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Users,
  MessagesSquare,
  User,
  ListChecks,
  FileText,
  CalendarCheck,
  Kanban,
  MessageCircle,
  Settings2,
  Sparkles,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useOmniConnectionMonitor } from "@/hooks/useOmniConnectionMonitor";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/clinica/omnichannel" },
  { icon: Users, label: "Agentes", path: "/clinica/omnichannel/agentes" },
  { icon: MessagesSquare, label: "Chat", path: "/clinica/chat" },
  { icon: Kanban, label: "CRM", path: "/clinica/crm" },
  { icon: User, label: "Contatos", path: "/clinica/omnichannel/contatos" },
  { icon: ListChecks, label: "Filas", path: "/clinica/omnichannel/filas" },
  { icon: FileText, label: "Relatórios", path: "/clinica/omnichannel/relatorios" },
  { icon: CalendarCheck, label: "Confirmação Agenda", path: "/clinica/omnichannel/confirmacao-agenda" },
];

interface OmniHeaderProps {
  clinicaId?: string;
}

export function OmniHeader({ clinicaId }: OmniHeaderProps) {
  const location = useLocation();
  const { atendimentos } = useOmniAtendimentos(clinicaId || null);
  const { hasDisconnectedQueues, disconnectedQueues } = useOmniConnectionMonitor(clinicaId || null);

  // Conta atendimentos em espera e em andamento
  const esperaCount = atendimentos?.filter(a => a.status === "aguardando").length || 0;
  const emAndamentoCount = atendimentos?.filter(a => a.status === "em_atendimento").length || 0;

  return (
    <div className="bg-card border-b border-border px-4 py-3">
      {/* Connection Alert Banner */}
      {hasDisconnectedQueues && (
        <NavLink to="/clinica/omnichannel/filas" className="block mb-3">
          <div className="flex items-center justify-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive hover:bg-destructive/20 transition-colors cursor-pointer">
            <WifiOff className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">
              ⚠️ {disconnectedQueues.length} fila{disconnectedQueues.length > 1 ? "s" : ""} desconectada{disconnectedQueues.length > 1 ? "s" : ""}: {disconnectedQueues.map(q => q.filaNome).join(", ")}
            </span>
            <Badge variant="destructive" className="text-xs">
              Clique para reconectar
            </Badge>
          </div>
        </NavLink>
      )}
      
      <div className="flex items-center justify-center gap-2">
        {navItems.map((item) => {
          const isExactMatch = item.path === "/clinica/omnichannel" 
            ? location.pathname === "/clinica/omnichannel"
            : location.pathname === item.path;

          const isChatItem = item.label === "Chat";

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink to={item.path}>
                  {isChatItem ? (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer font-medium text-sm",
                        isExactMatch
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      Chat
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
                        isExactMatch
                          ? "bg-primary text-primary-foreground shadow-lg scale-105"
                          : "border-2 border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:scale-105 hover:shadow-md"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                  )}
                </NavLink>
              </TooltipTrigger>
              {!isChatItem && (
                <TooltipContent side="bottom">
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}

        {/* Botão WhatsApp com badge */}
        <NavLink to="/clinica/omnichannel/whatsapp">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer font-medium text-sm relative",
              location.pathname === "/clinica/omnichannel/whatsapp"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
            {(esperaCount > 0 || emAndamentoCount > 0) && (
              <div className="flex items-center gap-1 ml-1">
                {esperaCount > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {esperaCount}
                  </span>
                )}
                {emAndamentoCount > 0 && (
                  <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {emAndamentoCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </NavLink>

        {/* Botão IA - exclusivo da clínica */}
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink to="/clinica/omnichannel/ia">
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer font-medium text-sm",
                  location.pathname === "/clinica/omnichannel/ia"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">IA</span>
              </div>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Inteligência Artificial</p>
          </TooltipContent>
        </Tooltip>

        {/* Botão Integrações - exclusivo da clínica */}
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink to="/clinica/omnichannel/integracoes">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
                  location.pathname === "/clinica/omnichannel/integracoes"
                    ? "bg-primary text-primary-foreground shadow-lg scale-105"
                    : "border-2 border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:scale-105 hover:shadow-md"
                )}
              >
                <Settings2 className="w-5 h-5" />
              </div>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Integrações</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

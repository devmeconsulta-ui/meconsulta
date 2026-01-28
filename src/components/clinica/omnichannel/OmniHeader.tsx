import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Users,
  MessagesSquare,
  User,
  ListChecks,
  FileText,
  Settings,
  CalendarCheck,
  Kanban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  { icon: Settings, label: "Configurações", path: "/clinica/omnichannel/configuracoes" },
];

// WhatsApp icon SVG component
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

interface OmniHeaderProps {
  atendimentosCount?: number;
}

export function OmniHeader({ atendimentosCount = 0 }: OmniHeaderProps) {
  const location = useLocation();

  return (
    <div className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40">
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

        {/* WhatsApp Chat Button - Atendimento de Pacientes */}
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink to="/clinica/omnichannel/whatsapp">
              <div className="relative">
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer font-medium text-sm",
                    location.pathname === "/clinica/omnichannel/whatsapp"
                      ? "bg-green-600 text-white shadow-lg"
                      : "bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800"
                  )}
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  WhatsApp
                </div>
                {atendimentosCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-2 border-white"
                  >
                    {atendimentosCount > 99 ? "99+" : atendimentosCount}
                  </Badge>
                )}
              </div>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Atendimentos WhatsApp</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

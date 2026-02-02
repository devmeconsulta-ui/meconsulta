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
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  { icon: Settings, label: "Configurações", path: "/clinica/configuracoes" },
];

export function OmniHeader() {
  const location = useLocation();

  return (
    <div className="bg-card border-b border-border px-4 py-3">
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
      </div>
    </div>
  );
}

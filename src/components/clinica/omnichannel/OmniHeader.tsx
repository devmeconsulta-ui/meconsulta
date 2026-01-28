import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Users,
  MessageCircle,
  User,
  ListChecks,
  FileText,
  Bell,
  Settings,
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/clinica/omnichannel" },
  { icon: Users, label: "Agentes", path: "/clinica/omnichannel/agentes" },
  { icon: MessageCircle, label: "Atendimentos", path: "/clinica/omnichannel/atendimentos" },
  { icon: User, label: "Contatos", path: "/clinica/omnichannel/contatos" },
  { icon: ListChecks, label: "Filas", path: "/clinica/omnichannel/filas" },
  { icon: FileText, label: "Relatórios", path: "/clinica/omnichannel/relatorios" },
  { icon: Wifi, label: "Instâncias", path: "/clinica/omnichannel/instancias" },
  { icon: Bell, label: "Notificações", path: "/clinica/omnichannel/notificacoes" },
  { icon: Settings, label: "Configurações", path: "/clinica/omnichannel/configuracoes" },
];

export function OmniHeader() {
  const location = useLocation();

  return (
    <div className="bg-card border-b border-border px-2 sm:px-6 py-3 sticky top-0 z-50">
      <ScrollArea className="w-full">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 min-w-max px-2">
          {navItems.map((item) => {
            const isExactMatch = item.path === "/clinica/omnichannel" 
              ? location.pathname === "/clinica/omnichannel"
              : location.pathname === item.path;

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <NavLink to={item.path}>
                    <div
                      className={cn(
                        "w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
                        isExactMatch
                          ? "bg-primary text-primary-foreground shadow-lg scale-105"
                          : "border-2 border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:scale-105 hover:shadow-md"
                      )}
                    >
                      <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  );
}

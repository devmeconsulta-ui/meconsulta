import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Users,
  MessageCircle,
  User,
  ListChecks,
  FileText,
  Printer,
  Bell,
  Settings,
  Power,
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-center gap-2">
        {navItems.map((item) => {
          const isExactMatch = item.path === "/clinica/omnichannel" 
            ? location.pathname === "/clinica/omnichannel"
            : location.pathname === item.path;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink to={item.path}>
                  <Button
                    variant="ghost"
                    size="lg"
                    className={cn(
                      "w-14 h-14 rounded-full transition-all",
                      isExactMatch
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                  </Button>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Separador e botão de voltar */}
        <div className="w-px h-10 bg-border mx-2" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <NavLink to="/clinica">
              <Button
                variant="ghost"
                size="lg"
                className="w-14 h-14 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Power className="w-6 h-6" />
              </Button>
            </NavLink>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Voltar para Clínica</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

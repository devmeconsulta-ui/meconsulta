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
    <div className="bg-slate-900 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-slate-900" />
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-white">Atendimentos</h1>
            <p className="text-xs text-slate-400">Central de Atendimento</p>
          </div>
        </div>

        {/* Navigation Icons */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/clinica/omnichannel" && location.pathname === "/clinica/omnichannel");
            
            // Check if it's exact match for dashboard
            const isExactMatch = item.path === "/clinica/omnichannel" 
              ? location.pathname === "/clinica/omnichannel"
              : location.pathname === item.path;

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <NavLink to={item.path}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "w-10 h-10 rounded-full transition-all",
                        isExactMatch
                          ? "bg-cyan-500 text-slate-900 hover:bg-cyan-400"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                    </Button>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Right side - Power button */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/clinica">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Power className="w-5 h-5" />
                </Button>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Voltar para Clínica</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

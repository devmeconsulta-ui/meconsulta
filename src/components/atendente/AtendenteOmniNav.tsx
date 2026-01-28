import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  User,
  CalendarCheck,
  Kanban,
  ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

// Itens de navegação para o atendente (sem itens administrativos)
const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Painel de Filas", path: "/atendente" },
  { icon: MessageCircle, label: "Chat", path: "/atendente/chat" },
  { icon: Kanban, label: "CRM", path: "/atendente/crm" },
  { icon: ListChecks, label: "Atendimentos", path: "/atendente/atendimentos" },
  { icon: User, label: "Contatos", path: "/atendente/contatos" },
  { icon: MessagesSquare, label: "Chat Interno", path: "/atendente/chat-interno" },
  { icon: CalendarCheck, label: "Confirmação Agenda", path: "/atendente/confirmacao-agenda" },
];

export function AtendenteOmniNav() {
  const location = useLocation();

  return (
    <div className="bg-card border-b border-border px-4 py-3 sticky top-[60px] z-40">
      <div className="flex items-center justify-center gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isExactMatch = item.path === "/atendente" 
            ? location.pathname === "/atendente"
            : location.pathname === item.path;

          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <NavLink to={item.path}>
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0",
                      isExactMatch
                        ? "bg-primary text-primary-foreground shadow-lg scale-105"
                        : "border-2 border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary hover:scale-105 hover:shadow-md"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
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
    </div>
  );
}

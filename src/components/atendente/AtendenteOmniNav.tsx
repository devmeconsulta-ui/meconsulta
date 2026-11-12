import { NavLink, useLocation, useOutletContext } from "react-router-dom";
import { 
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  User,
  CalendarCheck,
  Kanban,
  ListChecks,
  Camera
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOmniAtendimentos } from "@/hooks/useOmniAtendimentos";
import { useMemo } from "react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

// Itens de navegação para o atendente (sem itens administrativos e sem configurações)
const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Painel de Filas", path: "/atendente" },
  { icon: Kanban, label: "CRM", path: "/atendente/crm" },
  { icon: ListChecks, label: "Atendimentos", path: "/atendente/atendimentos" },
  { icon: User, label: "Contatos", path: "/atendente/contatos" },
  { icon: MessagesSquare, label: "Chat Interno", path: "/atendente/chat-interno" },
  { icon: CalendarCheck, label: "Confirmação Agenda", path: "/atendente/confirmacao-agenda" },
  { icon: Camera, label: "Fotos do prontuário", path: "/atendente/prontuario-fotos" },
];

interface AtendenteOmniNavProps {
  clinicaId?: string;
}

interface AtendenteContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  usuarioClinicaData: { id: string; nome: string } | null;
  currentUser: { id: string; nome: string } | null;
}

export function AtendenteOmniNav({ clinicaId }: AtendenteOmniNavProps) {
  const location = useLocation();
  
  // Get usuario_clinica ID from context
  let agenteId: string | undefined;
  try {
    const context = useOutletContext<AtendenteContext>();
    agenteId = context?.usuarioClinicaData?.id;
  } catch {
    // Not in an outlet context, ignore
  }
  
  const { atendimentos: allAtendimentos } = useOmniAtendimentos(clinicaId || null);

  // Filter atendimentos - agents can ONLY see atendimentos assigned to them
  const atendimentos = useMemo(() => {
    if (!allAtendimentos || !agenteId) return [];
    
    return allAtendimentos.filter((a) => a.agente_id === agenteId);
  }, [allAtendimentos, agenteId]);

  // Conta atendimentos em espera e em andamento (filtered by agent)
  const esperaCount = atendimentos?.filter(a => a.status === "aguardando").length || 0;
  const emAndamentoCount = atendimentos?.filter(a => a.status === "em_atendimento").length || 0;

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

        {/* Botão WhatsApp com badge - filtered by agent */}
        <NavLink to="/atendente/chat">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 cursor-pointer font-medium text-sm relative",
              location.pathname === "/atendente/chat"
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
      </div>
    </div>
  );
}

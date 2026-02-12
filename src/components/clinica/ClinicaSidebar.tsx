import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope,
  Calendar,
  Settings,
  Building2,
  MapPin,
  DollarSign,
  Star,
  Wallet,
  User,
  LogOut,
  Menu,
  X,
  LucideIcon,
  MessageSquare,
  Headset,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Layers,
  FileCode,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useUnreadChatMessages } from "@/hooks/useUnreadChatMessages";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  permission?: string;
}

interface MenuGroup {
  icon: LucideIcon;
  label: string;
  permission?: string;
  items: MenuItem[];
}

// Itens regulares do menu
const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/clinica", permission: "dashboard" },
  { icon: Stethoscope, label: "Médicos", path: "/clinica/medicos" },
  { icon: Calendar, label: "Consultas", path: "/clinica/consultas", permission: "consultas" },
  { icon: Users, label: "Pacientes", path: "/clinica/pacientes", permission: "pacientes" },
  { icon: MapPin, label: "Locais de Atendimento", path: "/clinica/locais", permission: "locais" },
  { icon: Calendar, label: "Agenda", path: "/clinica/agenda", permission: "agenda" },
  { icon: DollarSign, label: "Financeiro", path: "/clinica/financeiro", permission: "financeiro" },
  { icon: Wallet, label: "Dados Bancários", path: "/clinica/dados-bancarios" },
  { icon: Star, label: "Avaliações", path: "/clinica/avaliacoes" },
  { icon: User, label: "Usuários da Clínica", path: "/clinica/usuarios" },
  { icon: Settings, label: "Configurações", path: "/clinica/configuracoes" },
];

// Grupo TISS (submenu)
const tissGroup: MenuGroup = {
  icon: ClipboardList,
  label: "TISS",
  items: [
    { icon: Settings, label: "Configuração TISS", path: "/clinica/tiss/configuracoes" },
    { icon: Building2, label: "Operadoras/Contratos", path: "/clinica/tiss/operadoras" },
    { icon: CreditCard, label: "Carteirinhas", path: "/clinica/tiss/carteirinhas" },
    { icon: FileSpreadsheet, label: "TUSS Procedimentos", path: "/clinica/tuss" },
    { icon: FileText, label: "Guias", path: "/clinica/tiss/guias" },
    { icon: Layers, label: "Lotes", path: "/clinica/tiss/lotes" },
    { icon: FileCode, label: "Exportar XML", path: "/clinica/tiss/exportar-xml" },
    { icon: BarChart3, label: "Relatórios", path: "/clinica/tiss/relatorios" },
  ],
};

// Grupo de Atendimento (submenu) - visível para todos usuários da clínica
const atendimentoGroup: MenuGroup = {
  icon: Headset,
  label: "Atendimento",
  items: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/clinica/omnichannel" },
  ],
};

export function ClinicaSidebar() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [atendimentoOpen, setAtendimentoOpen] = useState(false);
  const [tissOpen, setTissOpen] = useState(false);
  
  // Obter ID da clínica do usuário atual
  const clinicaId = currentUser?.clinicaId || null;
  const { unreadCount } = useUnreadChatMessages({ clinicaId });

  // Auto-expand groups if on their routes
  useEffect(() => {
    const isOnAtendimentoRoute = atendimentoGroup.items.some(
      item => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
    ) || location.pathname.startsWith("/clinica/omnichannel");
    
    if (isOnAtendimentoRoute) setAtendimentoOpen(true);

    const isOnTissRoute = tissGroup.items.some(
      item => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
    ) || location.pathname.startsWith("/clinica/tiss");
    
    if (isOnTissRoute) setTissOpen(true);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  // Check if user is a clinic employee (has permissoes) vs clinic owner
  const isEmployee = currentUser?.permissoes && currentUser.permissoes.length > 0;
  const userPermissions = currentUser?.permissoes || [];

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter((item) => {
    if (!isEmployee) return true;
    if (!item.permission) return false;
    return userPermissions.includes(item.permission);
  });

  // Atendimento group is always visible for clinic users
  const showAtendimentoGroup = true;

  // All atendimento items visible (no permission filtering)
  const visibleAtendimentoItems = atendimentoGroup.items;

  // Check if any atendimento route is active
  const isAtendimentoActive = atendimentoGroup.items.some(
    item => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  ) || location.pathname.startsWith("/clinica/omnichannel");

  // Check if any TISS route is active
  const isTissActive = tissGroup.items.some(
    item => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
  ) || location.pathname.startsWith("/clinica/tiss");

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">MeConsulta</h1>
            <p className="text-xs text-muted-foreground">
              {isEmployee ? "Funcionário" : "Área da Clínica"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Dashboard item (first) */}
        <NavLink
          to="/clinica"
          end
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </NavLink>

        {/* Atendimento Group (collapsible submenu) */}
        {showAtendimentoGroup && visibleAtendimentoItems.length > 0 && (
          <Collapsible open={atendimentoOpen} onOpenChange={setAtendimentoOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isAtendimentoActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Headset className="w-5 h-5" />
                Atendimento
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-auto mr-2 h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
                {atendimentoOpen ? (
                  <ChevronDown className={cn("w-4 h-4 ml-auto", unreadCount > 0 && "ml-0")} />
                ) : (
                  <ChevronRight className={cn("w-4 h-4 ml-auto", unreadCount > 0 && "ml-0")} />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {visibleAtendimentoItems.map((item) => {
                const isChatItem = item.path === "/clinica/chat";
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/clinica/omnichannel"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        "bg-amber-400 text-amber-950 shadow-lg"
                      )
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {isChatItem && unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-xs px-1.5"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {visibleMenuItems
          .filter(item => item.path !== "/clinica") // Exclude Dashboard
          .map((item) => {
            const rendered = (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            );

            // Render TISS right after Financeiro
            if (item.path === "/clinica/financeiro") {
              return (
                <div key="financeiro-tiss-group" className="space-y-1">
                  {rendered}
                  {/* TISS Group (collapsible submenu) */}
                  <Collapsible open={tissOpen} onOpenChange={setTissOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                          isTissActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <ClipboardList className="w-5 h-5" />
                        TISS
                        {tissOpen ? (
                          <ChevronDown className="w-4 h-4 ml-auto" />
                        ) : (
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 mt-1">
                      {tissGroup.items.map((tissItem) => (
                        <NavLink
                          key={tissItem.path}
                          to={tissItem.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-lg"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )
                          }
                        >
                          <tissItem.icon className="w-4 h-4" />
                          {tissItem.label}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            }

            return rendered;
          })}
      </nav>

      {/* User info */}
      {currentUser && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-sm font-medium text-foreground truncate">{currentUser.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

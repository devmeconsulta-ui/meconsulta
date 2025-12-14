import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  permission?: string; // If set, requires this permission
}

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

export function ClinicaSidebar() {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  // Check if user is a clinic employee (has permissoes) vs clinic owner
  const isEmployee = currentUser?.permissoes && currentUser.permissoes.length > 0;
  const userPermissions = currentUser?.permissoes || [];

  // Filter menu items based on permissions
  const visibleMenuItems = menuItems.filter((item) => {
    // If user is owner (no permissoes), show all
    if (!isEmployee) return true;
    
    // If item has no permission requirement, check if user is owner or has specific access
    if (!item.permission) {
      // Only owners can see: Médicos, Dados Bancários, Avaliações, Usuários, Configurações
      return false;
    }
    
    // Check if user has required permission
    return userPermissions.includes(item.permission);
  });

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
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/clinica"}
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
        ))}
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

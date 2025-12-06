import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  MapPin,
  Calendar,
  User,
  Users,
  Wallet,
  Star,
  Settings,
  LogOut,
  Stethoscope,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Define all menu items with permission keys
const allMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/medico", permKey: "dashboard" },
  { icon: Stethoscope, label: "Consultas", path: "/medico/consultas", permKey: "consultas" },
  { icon: MapPin, label: "Locais de Atendimento", path: "/medico/locais", permKey: "locais" },
  { icon: Calendar, label: "Agenda", path: "/medico/agenda", permKey: "agenda" },
  { icon: Users, label: "Usuários da Clínica", path: "/medico/usuarios-clinica", permKey: "usuarios-clinica" },
  { icon: User, label: "Minha Página Pública", path: "/medico/pagina-publica", permKey: "pagina-publica" },
  { icon: Wallet, label: "Dados Bancários", path: "/medico/dados-bancarios", permKey: "dados-bancarios" },
  { icon: Star, label: "Avaliações", path: "/medico/avaliacoes", permKey: "avaliacoes" },
  { icon: Settings, label: "Configurações", path: "/medico/configuracoes", permKey: "configuracoes" },
];

export function MedicoSidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check if user is atendente (clinic staff)
  const isAtendente = currentUser?.papel === 'atendente';
  
  // Get permissions from currentUser (set during login for atendentes)
  const userPermissions = currentUser?.permissoes as string[] | undefined;

  // Filter menu items based on role and permissions
  const menuItems = allMenuItems.filter(item => {
    if (!isAtendente) {
      return true; // médico sees everything
    }
    // Atendente: check if they have permission for this item
    if (!userPermissions) return false;
    return userPermissions.includes(item.permKey);
  });

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">MeConsulta</h1>
            <p className="text-xs text-muted-foreground">Área do Médico</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/medico"}
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

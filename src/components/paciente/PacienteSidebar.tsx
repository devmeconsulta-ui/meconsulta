import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Calendar,
  Plus,
  Heart,
  User,
  Settings,
  LogOut,
  HeartPulse,
  Menu,
  X,
  Bell,
  FileText,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Início", path: "/paciente" },
  { icon: Calendar, label: "Minhas Consultas", path: "/paciente/consultas" },
  { icon: Plus, label: "Marcar Consulta", path: "/paciente/marcar", highlight: true },
  { icon: Heart, label: "Favoritos", path: "/paciente/favoritos" },
  { icon: FileText, label: "Histórico Médico", path: "/paciente/historico" },
  { icon: Bell, label: "Notificações", path: "/paciente/notificacoes" },
  { icon: CreditCard, label: "MeConsulta Pay", path: "/paciente/meconsulta-pay", highlight: true },
  { icon: User, label: "Meu Perfil", path: "/paciente/perfil" },
  { icon: Settings, label: "Configurações", path: "/paciente/configuracoes" },
];

export function PacienteSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <HeartPulse className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">MeConsulta</h1>
            <p className="text-xs text-muted-foreground">Área do Paciente</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/paciente"}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                item.highlight && !isActive && "bg-primary/10 text-primary hover:bg-primary/20"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
            {item.highlight && (
              <span className="ml-auto text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                Novo
              </span>
            )}
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

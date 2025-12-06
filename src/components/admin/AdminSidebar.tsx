import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  UserCog,
  Calendar,
  DollarSign,
  Wallet,
  Settings,
  Menu,
  X,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Papel = "atendente" | "supervisor" | "admin" | "superadmin";

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  allowedRoles: Papel[];
}

const menuItems: MenuItem[] = [
  { 
    title: "Dashboard", 
    url: "/admin", 
    icon: LayoutDashboard,
    allowedRoles: ["atendente", "supervisor", "admin", "superadmin"]
  },
  { 
    title: "Usuários", 
    url: "/admin/usuarios", 
    icon: UserCog,
    allowedRoles: ["admin", "superadmin"]
  },
  { 
    title: "Médicos", 
    url: "/admin/medicos", 
    icon: Stethoscope,
    allowedRoles: ["atendente", "supervisor", "admin", "superadmin"]
  },
  { 
    title: "Pacientes", 
    url: "/admin/pacientes", 
    icon: Users,
    allowedRoles: ["atendente", "supervisor", "admin", "superadmin"]
  },
  { 
    title: "Consultas", 
    url: "/admin/consultas", 
    icon: Calendar,
    allowedRoles: ["atendente", "supervisor", "admin", "superadmin"]
  },
  { 
    title: "Financeiro", 
    url: "/admin/financeiro", 
    icon: DollarSign,
    allowedRoles: ["atendente", "supervisor", "admin", "superadmin"]
  },
  { 
    title: "Configurações", 
    url: "/admin/configuracoes", 
    icon: Settings,
    allowedRoles: ["atendente", "supervisor", "admin", "superadmin"]
  },
  { 
    title: "Integrações", 
    url: "/admin/integracoes", 
    icon: Plug,
    allowedRoles: ["admin", "superadmin"]
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const userPapel = (currentUser?.papel as Papel) || "atendente";

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) =>
    item.allowedRoles.includes(userPapel)
  );

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">MeConsulta</h1>
            <p className="text-xs text-muted-foreground">Painel Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive(item.url)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

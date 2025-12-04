import { NavLink, useLocation } from "react-router-dom";
import { Home, Calendar, Plus, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Início", path: "/paciente" },
  { icon: Calendar, label: "Consultas", path: "/paciente/consultas" },
  { icon: Plus, label: "Marcar", path: "/paciente/marcar", highlight: true },
  { icon: Heart, label: "Favoritos", path: "/paciente/favoritos" },
  { icon: User, label: "Perfil", path: "/paciente/perfil" },
];

export function PacienteBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border lg:hidden z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/paciente" && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.highlight ? (
                <div className="w-12 h-12 -mt-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span className={cn("text-xs", item.highlight && "-mt-1")}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

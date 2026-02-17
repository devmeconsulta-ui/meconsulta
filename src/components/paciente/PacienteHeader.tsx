import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PacienteNotificacoesDropdown from "./PacienteNotificacoesDropdown";

interface PacienteHeaderProps {
  pacienteData: any;
}

export function PacienteHeader({ pacienteData }: PacienteHeaderProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "PA";
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      <div className="flex items-center justify-between px-6 py-4 lg:px-8">
        {/* Page Title - Hidden on mobile to give space for hamburger */}
        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold text-foreground">
            Olá, {pacienteData?.nome?.split(" ")[0] || currentUser?.nome?.split(" ")[0] || "Paciente"}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Bem-vindo à sua área de saúde
          </p>
        </div>

        {/* Mobile spacer */}
        <div className="lg:hidden" />

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Notifications Dropdown */}
          {pacienteData?.id && (
            <PacienteNotificacoesDropdown pacienteId={pacienteData.id} />
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  {pacienteData?.foto_url && (
                    <AvatarImage src={pacienteData.foto_url} alt={pacienteData?.nome} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(pacienteData?.nome || currentUser?.nome || "")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">
                  {pacienteData?.nome?.split(" ")[0] || currentUser?.nome?.split(" ")[0]}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{pacienteData?.nome || currentUser?.nome}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {currentUser?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/paciente/perfil")}>
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/paciente/configuracoes")}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AtendenteHeaderProps {
  clinicaData: any;
  usuarioClinicaData: any;
}

export function AtendenteHeader({ clinicaData, usuarioClinicaData }: AtendenteHeaderProps) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  const userName = usuarioClinicaData?.nome || currentUser?.nome || "Usuário";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="bg-primary text-primary-foreground px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Logo e nome da clínica */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-lg leading-tight">
              {clinicaData?.nome_fantasia || "Clínica"}
            </h1>
            <p className="text-xs text-white/70">
              Painel de Atendimento
            </p>
          </div>
        </div>

        {/* Perfil do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 text-primary-foreground hover:bg-white/10"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-white/20 text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline font-medium">{userName}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

  return (
    <header className="bg-primary text-primary-foreground sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold">
              {(pacienteData?.nome || currentUser?.nome || "P").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm opacity-90">Olá,</p>
            <p className="font-semibold text-sm">
              {pacienteData?.nome || currentUser?.nome}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

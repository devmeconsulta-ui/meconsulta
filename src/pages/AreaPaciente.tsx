import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, LogOut } from "lucide-react";

export default function AreaPaciente() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || currentUser.tipo !== "paciente") {
      navigate("/entrar");
    }
  }, [currentUser, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/entrar");
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Área do Paciente
            </h1>
            <p className="text-muted-foreground">
              Olá, <span className="font-semibold">{currentUser.nome}</span>!
            </p>
          </div>

          <p className="text-muted-foreground">
            Em construção. Aqui o paciente verá suas consultas, histórico e dados de perfil.
          </p>

          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.avif";
import { SignupModal } from "@/components/SignupModal";
import { TrocarSenhaModal } from "@/components/TrocarSenhaModal";
import { secureLogin } from "@/lib/secureAuth";

export default function Entrar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupInitialStep, setSignupInitialStep] = useState<"choose" | "paciente" | "clinica">("choose");

  // Check for cadastro parameter on mount
  useEffect(() => {
    if (searchParams.get("cadastro") === "true") {
      setSignupInitialStep("clinica");
      setSignupOpen(true);
      // Remove the parameter from URL
      searchParams.delete("cadastro");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const [trocarSenhaModal, setTrocarSenhaModal] = useState<{
    open: boolean;
    userId: string;
    userTable: "usuarios" | "usuarios_clinica";
    userData: any;
  }>({ open: false, userId: "", userTable: "usuarios", userData: null });
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const completeLogin = async (userData: any) => {
    await setCurrentUser({
      id: userData.id,
      nome: userData.nome,
      email: userData.email,
      tipo: userData.tipo as "admin" | "medico" | "paciente" | "clinica",
      papel: userData.papel as "atendente" | "supervisor" | "admin" | "superadmin" | "secretaria" | "gerente",
      pacienteId: userData.pacienteId,
      medicoId: userData.medicoId,
      clinicaId: userData.clinicaId,
      todosMedicos: userData.todosMedicos,
      permissoes: userData.permissoes,
      isClinicaUser: userData.isClinicaUser || false,
    });

    // Determine redirect based on user type and role
    if (userData.isClinicaUser) {
      const atendentePermissoes = ['confirmacao-agenda', 'chat', 'contatos', 'atendimentos'];
      const isAtendenteOnly = 
        userData.papel === "atendente" && 
        (!userData.permissoes || 
         userData.permissoes.length === 0 ||
         userData.permissoes.every((p: string) => atendentePermissoes.includes(p)));

      if (isAtendenteOnly) {
        navigate("/atendente");
      } else {
        navigate("/clinica");
      }
      return;
    }

    switch (userData.tipo) {
      case "admin":
        navigate("/admin");
        break;
      case "medico":
        navigate("/medico");
        break;
      case "paciente":
        navigate("/paciente");
        break;
      case "clinica":
        navigate("/clinica");
        break;
      default:
        navigate("/");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    // Input validation
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedSenha = senha.trim();

    if (!trimmedEmail || !trimmedSenha) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErro("Por favor, insira um e-mail válido.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await secureLogin(trimmedEmail, trimmedSenha);

      if (!result.success || !result.user) {
        setErro(result.error || "E-mail ou senha inválidos.");
        return;
      }

      // Check if user must change password
      if (result.user.deveTrocarSenha) {
        setTrocarSenhaModal({
          open: true,
          userId: result.user.id,
          userTable: result.user.isClinicaUser ? "usuarios_clinica" : "usuarios",
          userData: result.user,
        });
        return;
      }

      await completeLogin(result.user);
    } catch (err) {
      console.error("Erro inesperado:", err);
      setErro("Erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Link to="/">
              <img src={logo} alt="MeConsulta" className="h-12" />
            </Link>
          </div>

          {/* Welcome Text */}
          <h1 className="text-xl font-semibold text-center text-foreground mb-6">
            Seja bem-vindo ao MeConsulta
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  setTimeout(() => setEmail(pastedText.trim()), 0);
                }}
                autoComplete="email"
                disabled={isLoading}
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  setTimeout(() => setSenha(pastedText), 0);
                }}
                autoComplete="current-password"
                disabled={isLoading}
                maxLength={100}
              />
            </div>

            {erro && (
              <p className="text-sm text-destructive text-center">{erro}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Logar"
              )}
            </Button>

            {/* Password Reset Link */}
            <div className="text-center">
              <Link 
                to="/redefinir-senha" 
                className="text-sm text-primary hover:underline"
              >
                Esqueceu sua senha? Redefinir
              </Link>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Ainda não tem uma conta?
              </p>
              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={() => setSignupOpen(true)}
              >
                Cadastrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SignupModal 
        open={signupOpen} 
        onOpenChange={(open) => {
          setSignupOpen(open);
          if (!open) setSignupInitialStep("choose");
        }}
        initialStep={signupInitialStep}
      />
      
      <TrocarSenhaModal
        open={trocarSenhaModal.open}
        userId={trocarSenhaModal.userId}
        userTable={trocarSenhaModal.userTable}
        onSuccess={() => {
          setTrocarSenhaModal({ open: false, userId: "", userTable: "usuarios", userData: null });
          if (trocarSenhaModal.userData) {
            completeLogin(trocarSenhaModal.userData);
          }
        }}
      />
    </div>
  );
}

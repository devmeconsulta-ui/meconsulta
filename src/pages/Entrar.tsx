import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.avif";
import { SignupModal } from "@/components/SignupModal";

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!email.trim() || !senha.trim()) {
      setErro("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);

    try {
      // First, try to login as regular user (usuarios table)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, nome, email, tipo, papel")
        .eq("email", email.trim())
        .eq("senha_hash", senha)
        .eq("ativo", true)
        .maybeSingle();

      if (usuarioError) {
        console.error("Erro ao consultar usuário:", usuarioError);
        setErro("Erro ao conectar com o servidor. Tente novamente.");
        return;
      }

      if (usuarioData) {
        // Regular user login successful
        await setCurrentUser({
          id: usuarioData.id,
          nome: usuarioData.nome,
          email: usuarioData.email,
          tipo: usuarioData.tipo as "admin" | "medico" | "paciente" | "clinica",
          papel: usuarioData.papel as "atendente" | "supervisor" | "admin" | "superadmin",
        });

        // Redirect based on user type
        switch (usuarioData.tipo) {
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
        return;
      }

      // If not found in usuarios, try usuarios_clinica (clinic staff)
      const { data: clinicaUserData, error: clinicaError } = await supabase
        .from("usuarios_clinica")
        .select("id, nome, email, papel, medico_id, clinica_id, todos_medicos, ativo, permissoes")
        .eq("email", email.trim())
        .eq("senha_hash", senha)
        .eq("ativo", true)
        .maybeSingle();

      if (clinicaError) {
        console.error("Erro ao consultar usuário da clínica:", clinicaError);
        setErro("Erro ao conectar com o servidor. Tente novamente.");
        return;
      }

      if (clinicaUserData) {
        // Clinic user login successful
        // If user has clinica_id, redirect to clinica area, otherwise medico area
        if (clinicaUserData.clinica_id) {
          await setCurrentUser({
            id: clinicaUserData.id,
            nome: clinicaUserData.nome,
            email: clinicaUserData.email || "",
            tipo: "clinica", // Access clinica area
            papel: "atendente",
            clinicaId: clinicaUserData.clinica_id,
            medicoId: clinicaUserData.medico_id,
            todosMedicos: clinicaUserData.todos_medicos || false,
            permissoes: clinicaUserData.permissoes || [],
          });
          navigate("/clinica");
        } else {
          // Legacy: user linked to doctor only (no clinica_id)
          await setCurrentUser({
            id: clinicaUserData.id,
            nome: clinicaUserData.nome,
            email: clinicaUserData.email || "",
            tipo: "medico", // Access medico area
            papel: "atendente",
            medicoId: clinicaUserData.medico_id,
            permissoes: clinicaUserData.permissoes || [],
          });
          navigate("/medico");
        }
        return;
      }

      // No user found in either table
      setErro("E-mail ou senha inválidos, ou usuário inativo.");
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

      <SignupModal open={signupOpen} onOpenChange={setSignupOpen} />
    </div>
  );
}
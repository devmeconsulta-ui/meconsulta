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

export default function Entrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, nome, email, tipo, papel")
        .eq("email", email.trim())
        .eq("senha_hash", senha)
        .eq("ativo", true)
        .maybeSingle();

      if (error) {
        console.error("Erro ao consultar usuário:", error);
        setErro("Erro ao conectar com o servidor. Tente novamente.");
        return;
      }

      if (!data) {
        setErro("E-mail ou senha inválidos, ou usuário inativo.");
        return;
      }

      // Save user to context
      setCurrentUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        tipo: data.tipo as "admin" | "medico" | "paciente",
        papel: data.papel as "atendente" | "supervisor" | "admin" | "superadmin",
      });

      // Redirect based on user type
      switch (data.tipo) {
        case "admin":
          navigate("/admin");
          break;
        case "medico":
          navigate("/medico");
          break;
        case "paciente":
          navigate("/paciente");
          break;
        default:
          navigate("/");
      }
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
              <Link to="/cadastrar">
                <Button variant="outline" className="w-full">
                  Cadastrar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
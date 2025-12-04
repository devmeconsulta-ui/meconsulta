import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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
        .select("id, nome, email, tipo")
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
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Entrar no MeConsulta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

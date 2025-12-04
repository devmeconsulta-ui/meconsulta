import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Stethoscope, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "choose" | "paciente" | "medico";

export function SignupModal({ open, onOpenChange }: SignupModalProps) {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);

  const [pacienteData, setPacienteData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    senha: "",
  });

  const [medicoData, setMedicoData] = useState({
    nome: "",
    email: "",
    telefone: "",
    crm: "",
    especialidade: "",
    senha: "",
  });

  async function handlePacienteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", pacienteData.email)
        .maybeSingle();

      if (existingUser) {
        toast.error("Este e-mail já está cadastrado");
        setLoading(false);
        return;
      }

      // Create usuario
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: pacienteData.nome,
          email: pacienteData.email,
          tipo: "paciente",
          papel: "paciente",
          senha_hash: pacienteData.senha, // In production, hash the password
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create paciente
      const { error: pacienteError } = await supabase.from("pacientes").insert({
        nome: pacienteData.nome,
        usuario_id: usuario.id,
        telefone: pacienteData.telefone,
        cpf: pacienteData.cpf,
      });

      if (pacienteError) throw pacienteError;

      toast.success("Cadastro realizado com sucesso!");

      // Auto login
      setCurrentUser({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: "paciente",
      });

      onOpenChange(false);
      navigate("/paciente");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao realizar cadastro");
    } finally {
      setLoading(false);
    }
  }

  async function handleMedicoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", medicoData.email)
        .maybeSingle();

      if (existingUser) {
        toast.error("Este e-mail já está cadastrado");
        setLoading(false);
        return;
      }

      // Create usuario
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: medicoData.nome,
          email: medicoData.email,
          tipo: "medico",
          papel: "medico",
          senha_hash: medicoData.senha, // In production, hash the password
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create medico
      const { error: medicoError } = await supabase.from("medicos").insert({
        nome: medicoData.nome,
        usuario_id: usuario.id,
        crm: medicoData.crm,
        especialidade: medicoData.especialidade,
        valor_consulta: 160, // Default value
      });

      if (medicoError) throw medicoError;

      toast.success("Cadastro realizado com sucesso!");

      // Auto login
      setCurrentUser({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: "medico",
      });

      onOpenChange(false);
      navigate("/medico");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao realizar cadastro");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("choose");
    setPacienteData({ nome: "", email: "", telefone: "", cpf: "", senha: "" });
    setMedicoData({ nome: "", email: "", telefone: "", crm: "", especialidade: "", senha: "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "Como deseja se cadastrar?"}
            {step === "paciente" && "Cadastro de Paciente"}
            {step === "medico" && "Cadastro de Médico"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={() => setStep("paciente")}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Sou Paciente</p>
                <p className="text-sm text-muted-foreground">Quero agendar consultas</p>
              </div>
            </button>

            <button
              onClick={() => setStep("medico")}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-secondary" />
              </div>
              <div className="text-center">
                <p className="font-semibold">Sou Médico</p>
                <p className="text-sm text-muted-foreground">Quero atender pacientes</p>
              </div>
            </button>
          </div>
        )}

        {step === "paciente" && (
          <form onSubmit={handlePacienteSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 mb-2"
              onClick={() => setStep("choose")}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={pacienteData.nome}
                onChange={(e) => setPacienteData({ ...pacienteData, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={pacienteData.email}
                onChange={(e) => setPacienteData({ ...pacienteData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={pacienteData.telefone}
                onChange={(e) => setPacienteData({ ...pacienteData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={pacienteData.cpf}
                onChange={(e) => setPacienteData({ ...pacienteData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={pacienteData.senha}
                onChange={(e) => setPacienteData({ ...pacienteData, senha: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
        )}

        {step === "medico" && (
          <form onSubmit={handleMedicoSubmit} className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 mb-2"
              onClick={() => setStep("choose")}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={medicoData.nome}
                onChange={(e) => setMedicoData({ ...medicoData, nome: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={medicoData.email}
                onChange={(e) => setMedicoData({ ...medicoData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={medicoData.telefone}
                onChange={(e) => setMedicoData({ ...medicoData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>CRM *</Label>
              <Input
                value={medicoData.crm}
                onChange={(e) => setMedicoData({ ...medicoData, crm: e.target.value })}
                placeholder="CRM/UF 000000"
                required
              />
            </div>
            <div>
              <Label>Especialidade *</Label>
              <Input
                value={medicoData.especialidade}
                onChange={(e) => setMedicoData({ ...medicoData, especialidade: e.target.value })}
                placeholder="Ex: Cardiologia"
                required
              />
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={medicoData.senha}
                onChange={(e) => setMedicoData({ ...medicoData, senha: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

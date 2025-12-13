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
import { User, Stethoscope, ArrowLeft, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "choose" | "paciente" | "medico" | "clinica";

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

  const [clinicaData, setClinicaData] = useState({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
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

  async function handleClinicaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("usuarios")
        .select("id")
        .eq("email", clinicaData.email)
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
          nome: clinicaData.nomeFantasia,
          email: clinicaData.email,
          tipo: "clinica",
          papel: "clinica",
          senha_hash: clinicaData.senha,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create clinica
      const { error: clinicaError } = await supabase.from("clinicas").insert({
        nome_fantasia: clinicaData.nomeFantasia,
        razao_social: clinicaData.razaoSocial,
        cnpj: clinicaData.cnpj,
        email_contato: clinicaData.email,
        telefone: clinicaData.telefone,
        cidade: clinicaData.cidade,
        estado: clinicaData.estado,
        usuario_id: usuario.id,
      });

      if (clinicaError) throw clinicaError;

      toast.success("Cadastro realizado com sucesso!");

      // Auto login
      setCurrentUser({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: "clinica",
      });

      onOpenChange(false);
      navigate("/clinica");
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
    setClinicaData({ nomeFantasia: "", razaoSocial: "", cnpj: "", email: "", telefone: "", cidade: "", estado: "", senha: "" });
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
            {step === "clinica" && "Cadastro de Clínica"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid grid-cols-3 gap-3 py-4">
            <button
              onClick={() => setStep("paciente")}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Sou Paciente</p>
                <p className="text-xs text-muted-foreground">Quero agendar consultas</p>
              </div>
            </button>

            <button
              onClick={() => setStep("medico")}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                <Stethoscope className="w-7 h-7 text-secondary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Sou Médico</p>
                <p className="text-xs text-muted-foreground">Quero atender pacientes</p>
              </div>
            </button>

            <button
              onClick={() => setStep("clinica")}
              className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">Sou Clínica</p>
                <p className="text-xs text-muted-foreground">Quero gerenciar médicos</p>
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

        {step === "clinica" && (
          <form onSubmit={handleClinicaSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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
              <Label>Nome Fantasia *</Label>
              <Input
                value={clinicaData.nomeFantasia}
                onChange={(e) => setClinicaData({ ...clinicaData, nomeFantasia: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Razão Social</Label>
              <Input
                value={clinicaData.razaoSocial}
                onChange={(e) => setClinicaData({ ...clinicaData, razaoSocial: e.target.value })}
              />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input
                value={clinicaData.cnpj}
                onChange={(e) => setClinicaData({ ...clinicaData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={clinicaData.email}
                onChange={(e) => setClinicaData({ ...clinicaData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={clinicaData.telefone}
                onChange={(e) => setClinicaData({ ...clinicaData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cidade</Label>
                <Input
                  value={clinicaData.cidade}
                  onChange={(e) => setClinicaData({ ...clinicaData, cidade: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={clinicaData.estado}
                  onChange={(e) => setClinicaData({ ...clinicaData, estado: e.target.value })}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <Label>Senha *</Label>
              <Input
                type="password"
                value={clinicaData.senha}
                onChange={(e) => setClinicaData({ ...clinicaData, senha: e.target.value })}
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

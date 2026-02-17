import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User, Save, Mail, Phone, MapPin, Calendar, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { brazilStates, citiesByState } from "@/data/brazilData";
import { useAuth } from "@/contexts/AuthContext";

interface PacienteContext {
  pacienteData: any;
  setPacienteData: (data: any) => void;
}

export default function PacientePerfil() {
  const { currentUser } = useAuth();
  const { pacienteData, setPacienteData } = useOutletContext<PacienteContext>();
  
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    data_nascimento: "",
    estado: "",
    cidade: "",
    bairro: "",
  });
  
  const [saving, setSaving] = useState(false);

  // Sincronizar formData quando pacienteData carregar
  useEffect(() => {
    if (pacienteData) {
      setFormData({
        nome: pacienteData.nome || "",
        telefone: pacienteData.telefone || "",
        cpf: pacienteData.cpf || "",
        data_nascimento: pacienteData.data_nascimento || "",
        estado: pacienteData.estado || "",
        cidade: pacienteData.cidade || "",
        bairro: pacienteData.bairro || "",
      });
    }
  }, [pacienteData]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      if (field === "estado") {
        return { ...prev, [field]: value, cidade: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .slice(0, 14);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const handleSave = async () => {
    if (!pacienteData?.id) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("pacientes")
      .update({
        nome: formData.nome,
        telefone: formData.telefone.replace(/\D/g, ""),
        cpf: formData.cpf.replace(/\D/g, ""),
        data_nascimento: formData.data_nascimento || null,
        estado: formData.estado,
        cidade: formData.cidade,
        bairro: formData.bairro,
      })
      .eq("id", pacienteData.id);

    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      toast.success("Perfil atualizado com sucesso!");
      setPacienteData({ ...pacienteData, ...formData });
    }
    
    setSaving(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="card-shadow lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                {pacienteData?.foto_url && (
                  <AvatarImage src={pacienteData.foto_url} alt={formData.nome} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(formData.nome)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{formData.nome || "Paciente"}</h3>
              <p className="text-muted-foreground text-sm">{currentUser?.email}</p>
              
              <Separator className="my-6" />
              
              <div className="w-full space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{currentUser?.email}</span>
                </div>
                {formData.telefone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{formData.telefone}</span>
                  </div>
                )}
                {formData.cidade && formData.estado && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{formData.cidade}, {formData.estado}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="card-shadow lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Mantenha seus dados atualizados para facilitar o agendamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  placeholder="Seu nome completo"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formatPhone(formData.telefone)}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formatCPF(formData.cpf)}
                  onChange={(e) => handleChange("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="data_nascimento">Data de nascimento</Label>
                <Input
                  id="data_nascimento"
                  type="date"
                  value={formData.data_nascimento}
                  onChange={(e) => handleChange("data_nascimento", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4" />
                Endereço
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select 
                    value={formData.estado} 
                    onValueChange={(v) => handleChange("estado", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {brazilStates.map(s => (
                        <SelectItem key={s.sigla} value={s.sigla}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Select 
                    value={formData.cidade} 
                    onValueChange={(v) => handleChange("cidade", v)}
                    disabled={!formData.estado}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {(citiesByState[formData.estado] || []).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => handleChange("bairro", e.target.value)}
                    placeholder="Seu bairro"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full sm:w-auto gap-2"
              size="lg"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Security Card */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Gerencie a segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Alterar senha</p>
              <p className="text-sm text-muted-foreground">
                Atualize sua senha periodicamente para manter sua conta segura
              </p>
            </div>
            <Button variant="outline">Alterar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

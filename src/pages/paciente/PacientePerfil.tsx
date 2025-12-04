import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { User, Save } from "lucide-react";
import { toast } from "sonner";
import { brazilStates, citiesByState } from "@/data/brazilData";

interface PacienteContext {
  pacienteData: any;
  setPacienteData: (data: any) => void;
}

export default function PacientePerfil() {
  const { pacienteData, setPacienteData } = useOutletContext<PacienteContext>();
  
  const [formData, setFormData] = useState({
    nome: pacienteData?.nome || "",
    telefone: pacienteData?.telefone || "",
    cpf: pacienteData?.cpf || "",
    data_nascimento: pacienteData?.data_nascimento || "",
    estado: pacienteData?.estado || "",
    cidade: pacienteData?.cidade || "",
    bairro: pacienteData?.bairro || "",
  });
  
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      if (field === "estado") {
        return { ...prev, [field]: value, cidade: "" };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!pacienteData?.id) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("pacientes")
      .update({
        nome: formData.nome,
        telefone: formData.telefone,
        cpf: formData.cpf,
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <span>{formData.nome || "Paciente"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange("telefone", e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleChange("cpf", e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="data_nascimento">Data de nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => handleChange("data_nascimento", e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="font-medium mb-4">Endereço</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Select 
                  value={formData.estado} 
                  onValueChange={(v) => handleChange("estado", v)}
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(citiesByState[formData.estado] || []).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={formData.bairro}
                onChange={(e) => handleChange("bairro", e.target.value)}
                placeholder="Seu bairro"
              />
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

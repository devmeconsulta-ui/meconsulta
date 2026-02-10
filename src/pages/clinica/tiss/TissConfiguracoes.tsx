import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TissConfiguracoes() {
  const [config, setConfig] = useState({
    versao_tiss: "4.01.00",
    registro_ans: "",
    cnes: "",
    cnpj_prestador: "",
    razao_social: "",
    tipo_prestador: "clinica",
    codigo_ibge: "",
  });

  const handleSave = () => {
    toast.success("Configurações TISS salvas com sucesso");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configuração TISS</h2>
        <p className="text-muted-foreground">
          Configure os dados do prestador para geração de guias e XML TISS
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Dados do Prestador
          </CardTitle>
          <CardDescription>
            Informações utilizadas no cabeçalho das guias TISS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Versão TISS</Label>
              <Select value={config.versao_tiss} onValueChange={(v) => setConfig(p => ({ ...p, versao_tiss: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="4.01.00">4.01.00</SelectItem>
                  <SelectItem value="4.00.02">4.00.02</SelectItem>
                  <SelectItem value="3.05.00">3.05.00</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Registro ANS</Label>
              <Input
                placeholder="Nº do registro na ANS"
                value={config.registro_ans}
                onChange={(e) => setConfig(p => ({ ...p, registro_ans: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CNES</Label>
              <Input
                placeholder="Código CNES"
                value={config.cnes}
                onChange={(e) => setConfig(p => ({ ...p, cnes: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ do Prestador</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={config.cnpj_prestador}
                onChange={(e) => setConfig(p => ({ ...p, cnpj_prestador: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Razão Social</Label>
              <Input
                placeholder="Razão social do prestador"
                value={config.razao_social}
                onChange={(e) => setConfig(p => ({ ...p, razao_social: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo Prestador</Label>
              <Select value={config.tipo_prestador} onValueChange={(v) => setConfig(p => ({ ...p, tipo_prestador: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinica">Clínica</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="laboratorio">Laboratório</SelectItem>
                  <SelectItem value="consultorio">Consultório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Código IBGE (Município)</Label>
              <Input
                placeholder="Código IBGE"
                value={config.codigo_ibge}
                onChange={(e) => setConfig(p => ({ ...p, codigo_ibge: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleSave} className="mt-4">
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

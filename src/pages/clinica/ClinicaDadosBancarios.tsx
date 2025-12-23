import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import { Building, CreditCard, Key, Save, MessageSquare } from "lucide-react";

interface ClinicaContext {
  clinicaData: any;
}

export default function ClinicaDadosBancarios() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    banco_nome: "",
    banco_codigo: "",
    agencia: "",
    conta: "",
    tipo_conta: "corrente",
    titular_nome: "",
    titular_cpf_cnpj: "",
    pix_key: "",
    pix_key_type: "cnpj",
    telefone: "",
  });

  const bancos = [
    { codigo: "001", nome: "Banco do Brasil" },
    { codigo: "033", nome: "Santander" },
    { codigo: "104", nome: "Caixa Econômica" },
    { codigo: "237", nome: "Bradesco" },
    { codigo: "341", nome: "Itaú" },
    { codigo: "077", nome: "Inter" },
    { codigo: "260", nome: "Nubank" },
    { codigo: "290", nome: "PagBank" },
    { codigo: "380", nome: "PicPay" },
    { codigo: "336", nome: "C6 Bank" },
  ];

  useEffect(() => {
    if (clinicaData) {
      setFormData({
        banco_nome: clinicaData.banco_nome || "",
        banco_codigo: clinicaData.banco_codigo || "",
        agencia: clinicaData.agencia || "",
        conta: clinicaData.conta || "",
        tipo_conta: clinicaData.tipo_conta || "corrente",
        titular_nome: clinicaData.titular_nome || clinicaData.razao_social || clinicaData.nome_fantasia || "",
        titular_cpf_cnpj: clinicaData.titular_cpf_cnpj || clinicaData.cnpj || "",
        pix_key: clinicaData.pix_key || "",
        pix_key_type: clinicaData.pix_key_type || "cnpj",
        telefone: clinicaData.telefone || "",
      });
      setLoading(false);
    }
  }, [clinicaData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicaData?.id) return;

    setSaving(true);
    
    const { error } = await supabase
      .from("clinicas")
      .update({
        banco_nome: formData.banco_nome,
        banco_codigo: formData.banco_codigo,
        agencia: formData.agencia,
        conta: formData.conta,
        tipo_conta: formData.tipo_conta,
        titular_nome: formData.titular_nome,
        titular_cpf_cnpj: formData.titular_cpf_cnpj,
        pix_key: formData.pix_key,
        pix_key_type: formData.pix_key_type,
        telefone: formData.telefone,
      })
      .eq("id", clinicaData.id);

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar dados bancários:", error);
      toast.error("Erro ao salvar dados");
      return;
    }

    toast.success("Dados bancários salvos com sucesso!");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dados Bancários</h2>
        <p className="text-muted-foreground">
          Configure os dados bancários da clínica para recebimentos
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Conta Bancária */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Conta Bancária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Banco</Label>
                <Select
                  value={formData.banco_codigo}
                  onValueChange={(value) => {
                    const banco = bancos.find((b) => b.codigo === value);
                    setFormData({
                      ...formData,
                      banco_codigo: value,
                      banco_nome: banco?.nome || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map((banco) => (
                      <SelectItem key={banco.codigo} value={banco.codigo}>
                        {banco.codigo} - {banco.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agência</Label>
                  <Input
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="0000"
                  />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="00000-0"
                  />
                </div>
              </div>

              <div>
                <Label>Tipo de Conta</Label>
                <Select
                  value={formData.tipo_conta}
                  onValueChange={(value) => setFormData({ ...formData, tipo_conta: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Conta Corrente</SelectItem>
                    <SelectItem value="poupanca">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Titular */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Titular da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Razão Social / Nome do Titular</Label>
                <Input
                  value={formData.titular_nome}
                  onChange={(e) => setFormData({ ...formData, titular_nome: e.target.value })}
                  placeholder="Nome completo ou razão social"
                />
              </div>

              <div>
                <Label>CPF/CNPJ do Titular</Label>
                <Input
                  value={formData.titular_cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, titular_cpf_cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </CardContent>
          </Card>

          {/* PIX */}
          <Card className="card-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Chave PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Chave PIX</Label>
                  <Select
                    value={formData.pix_key_type}
                    onValueChange={(value) => setFormData({ ...formData, pix_key_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Chave PIX</Label>
                  <Input
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                    placeholder={
                      formData.pix_key_type === "cnpj"
                        ? "00.000.000/0000-00"
                        : formData.pix_key_type === "email"
                        ? "email@exemplo.com"
                        : formData.pix_key_type === "telefone"
                        ? "+55 00 00000-0000"
                        : "Chave PIX"
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card className="card-shadow lg:col-span-2 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Telefone de contato da clínica para notificações e comunicação.
              </p>
              <div className="max-w-md">
                <Label>Telefone/WhatsApp</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Dados"}
          </Button>
        </div>
      </form>
    </div>
  );
}

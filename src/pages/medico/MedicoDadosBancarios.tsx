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
import { Wallet, Save, Building, CreditCard, Key, MessageSquare } from "lucide-react";

interface MedicoContext {
  medicoData: any;
}

export default function MedicoDadosBancarios() {
  const { medicoData } = useOutletContext<MedicoContext>();
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
    pix_key_type: "cpf",
    telefone_whatsapp: "",
  });

  useEffect(() => {
    if (medicoData) {
      setFormData({
        banco_nome: medicoData.banco_nome || "",
        banco_codigo: medicoData.banco_codigo || "",
        agencia: medicoData.agencia || "",
        conta: medicoData.conta || "",
        tipo_conta: medicoData.tipo_conta || "corrente",
        titular_nome: medicoData.titular_nome || "",
        titular_cpf_cnpj: medicoData.titular_cpf_cnpj || "",
        pix_key: medicoData.pix_key || "",
        pix_key_type: medicoData.pix_key_type || "cpf",
        telefone_whatsapp: medicoData.telefone_whatsapp || "",
      });
      setLoading(false);
    }
  }, [medicoData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!medicoData?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from("medicos")
      .update(formData)
      .eq("id", medicoData.id);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar dados bancários");
      return;
    }

    toast.success("Dados bancários salvos com sucesso!");
  }

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
          Informe seus dados bancários para receber os repasses
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
                <Label>Banco *</Label>
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
                  <Label>Agência *</Label>
                  <Input
                    value={formData.agencia}
                    onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
                    placeholder="0000"
                  />
                </div>
                <div>
                  <Label>Conta *</Label>
                  <Input
                    value={formData.conta}
                    onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
                    placeholder="00000-0"
                  />
                </div>
              </div>

              <div>
                <Label>Tipo de Conta *</Label>
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
                <Label>Nome do Titular *</Label>
                <Input
                  value={formData.titular_nome}
                  onChange={(e) => setFormData({ ...formData, titular_nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label>CPF/CNPJ do Titular *</Label>
                <Input
                  value={formData.titular_cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, titular_cpf_cnpj: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </CardContent>
          </Card>

          {/* PIX */}
          <Card className="card-shadow lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Chave PIX (Preferencial para Repasses)
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
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
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
                      formData.pix_key_type === "cpf"
                        ? "000.000.000-00"
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

          {/* WhatsApp Notifications */}
          <Card className="card-shadow lg:col-span-2 border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                Notificações por WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe seu número de WhatsApp para receber notificações sobre novas consultas e alterações.
              </p>
              <div className="max-w-md">
                <Label>Telefone/WhatsApp</Label>
                <Input
                  value={formData.telefone_whatsapp}
                  onChange={(e) => setFormData({ ...formData, telefone_whatsapp: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esse será o número usado para receber notificações de novas consultas e alterações.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Dados Bancários"}
          </Button>
        </div>
      </form>
    </div>
  );
}

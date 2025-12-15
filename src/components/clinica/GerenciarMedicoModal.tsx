import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  X,
  Stethoscope,
  MapPin,
  FileText,
  Globe,
  Trash2,
  Building2,
  Check,
  AlertCircle,
} from "lucide-react";

const especialidades = [
  "Cardiologia", "Dermatologia", "Endocrinologia", "Gastroenterologia",
  "Ginecologia", "Neurologia", "Oftalmologia", "Ortopedia", "Pediatria",
  "Psiquiatria", "Urologia", "Clínico Geral", "Otorrinolaringologia",
  "Pneumologia", "Reumatologia", "Geriatria", "Medicina do Trabalho",
  "Medicina Esportiva", "Nutrição", "Fisioterapia", "Psicologia"
];

interface GerenciarMedicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medico: any;
  clinicaId: string;
  clinicaData: any;
  onSuccess: () => void;
}

interface Local {
  id: string;
  nome_local: string;
  tipo_atendimento: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ativo: boolean;
}

interface Servico {
  id: string;
  nome_servico: string;
  ativo: boolean;
}

export function GerenciarMedicoModal({
  open,
  onOpenChange,
  medico,
  clinicaId,
  clinicaData,
  onSuccess,
}: GerenciarMedicoModalProps) {
  const [activeTab, setActiveTab] = useState("perfil");
  const [loading, setLoading] = useState(false);
  
  // Perfil
  const [formData, setFormData] = useState({
    nome: "",
    especialidade: "",
    crm: "",
    telefone_whatsapp: "",
    valor_consulta: "",
    bio: "",
    formacao: [] as string[],
    foto_url: "",
    aparecer_home: false,
  });
  const [novaFormacao, setNovaFormacao] = useState("");
  
  // Local da clínica
  const [localClinica, setLocalClinica] = useState<Local | null>(null);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [localAtivo, setLocalAtivo] = useState(true);
  
  // Serviços
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [novoServico, setNovoServico] = useState("");

  useEffect(() => {
    if (open && medico) {
      setFormData({
        nome: medico.nome || "",
        especialidade: medico.especialidade || "",
        crm: medico.crm || "",
        telefone_whatsapp: medico.telefone_whatsapp || "",
        valor_consulta: medico.valor_consulta?.toString() || "",
        bio: medico.bio || "",
        formacao: medico.formacao || [],
        foto_url: medico.foto_url || "",
        aparecer_home: medico.aparecer_home || false,
      });
      fetchLocalClinica();
      fetchServicos();
    }
  }, [open, medico]);

  async function fetchLocalClinica() {
    if (!medico?.id || !clinicaId) return;
    setLoadingLocais(true);
    
    const { data } = await supabase
      .from("locais_atendimento")
      .select("*")
      .eq("medico_id", medico.id)
      .eq("clinica_id", clinicaId)
      .maybeSingle();
    
    setLocalClinica(data);
    setLocalAtivo(data?.ativo ?? true);
    setLoadingLocais(false);
  }

  async function handleVincularLocal() {
    if (!clinicaData?.endereco_principal) {
      toast.error("A clínica não possui endereço cadastrado. Cadastre primeiro em 'Locais'.");
      return;
    }

    setLoadingLocais(true);
    const { error } = await supabase
      .from("locais_atendimento")
      .insert({
        medico_id: medico.id,
        clinica_id: clinicaId,
        nome_local: clinicaData.nome_fantasia || "Clínica",
        tipo_atendimento: "presencial",
        endereco: clinicaData.endereco_principal,
        cidade: clinicaData.cidade,
        estado: clinicaData.estado,
        ativo: true,
      });

    if (error) {
      toast.error("Erro ao vincular local");
    } else {
      toast.success("Médico vinculado ao endereço da clínica!");
      fetchLocalClinica();
    }
    setLoadingLocais(false);
  }

  async function handleToggleLocalAtivo() {
    if (!localClinica) return;
    
    const newStatus = !localAtivo;
    const { error } = await supabase
      .from("locais_atendimento")
      .update({ ativo: newStatus })
      .eq("id", localClinica.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setLocalAtivo(newStatus);
      toast.success(newStatus ? "Local ativado!" : "Local desativado!");
    }
  }

  async function fetchServicos() {
    if (!medico?.id) return;
    setLoadingServicos(true);
    const { data } = await supabase
      .from("medico_servicos")
      .select("*")
      .eq("medico_id", medico.id)
      .order("nome_servico");
    setServicos(data || []);
    setLoadingServicos(false);
  }

  // Perfil handlers
  const handleAddFormacao = () => {
    if (novaFormacao.trim()) {
      setFormData(prev => ({
        ...prev,
        formacao: [...prev.formacao, novaFormacao.trim()]
      }));
      setNovaFormacao("");
    }
  };

  const handleRemoveFormacao = (index: number) => {
    setFormData(prev => ({
      ...prev,
      formacao: prev.formacao.filter((_, i) => i !== index)
    }));
  };

  async function handleSavePerfil() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("medicos")
        .update({
          nome: formData.nome,
          especialidade: formData.especialidade,
          crm: formData.crm,
          telefone_whatsapp: formData.telefone_whatsapp,
          valor_consulta: parseFloat(formData.valor_consulta) || 0,
          bio: formData.bio,
          formacao: formData.formacao,
          foto_url: formData.foto_url,
          aparecer_home: formData.aparecer_home,
        })
        .eq("id", medico.id);

      if (error) throw error;
      toast.success("Perfil atualizado!");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao salvar perfil");
    } finally {
      setLoading(false);
    }
  }

  // Serviço handlers
  async function handleAddServico() {
    if (!novoServico.trim()) return;

    const { error } = await supabase
      .from("medico_servicos")
      .insert({
        medico_id: medico.id,
        nome_servico: novoServico.trim(),
        ativo: true,
      });

    if (error) {
      toast.error("Erro ao adicionar serviço");
    } else {
      toast.success("Serviço adicionado!");
      setNovoServico("");
      fetchServicos();
    }
  }

  async function handleToggleServicoAtivo(servico: Servico) {
    const { error } = await supabase
      .from("medico_servicos")
      .update({ ativo: !servico.ativo })
      .eq("id", servico.id);

    if (error) {
      toast.error("Erro ao atualizar serviço");
    } else {
      fetchServicos();
    }
  }

  async function handleDeleteServico(id: string) {
    const { error } = await supabase
      .from("medico_servicos")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir serviço");
    } else {
      toast.success("Serviço excluído!");
      fetchServicos();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from('fotos-medicos')
      .upload(fileName, file);
    if (error) {
      toast.error("Erro ao fazer upload da foto");
      return;
    }
    const { data: urlData } = supabase.storage.from('fotos-medicos').getPublicUrl(fileName);
    setFormData(prev => ({ ...prev, foto_url: urlData.publicUrl }));
    toast.success("Foto enviada!");
  }

  const hasClinicaEndereco = clinicaData?.endereco_principal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Gerenciar Médico - {medico?.nome}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="perfil" className="gap-1">
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="locais" className="gap-1">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Local</span>
              {localClinica && <Badge variant="secondary" className="ml-1 h-5 px-1.5">1</Badge>}
            </TabsTrigger>
            <TabsTrigger value="servicos" className="gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Serviços</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">{servicos.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Tab Perfil */}
            <TabsContent value="perfil" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Especialidade</Label>
                  <Select
                    value={formData.especialidade}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, especialidade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {especialidades.map((esp) => (
                        <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CRM</Label>
                  <Input
                    value={formData.crm}
                    onChange={(e) => setFormData(prev => ({ ...prev, crm: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={formData.telefone_whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefone_whatsapp: e.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Valor da Consulta</Label>
                  <Input
                    type="number"
                    value={formData.valor_consulta}
                    onChange={(e) => setFormData(prev => ({ ...prev, valor_consulta: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto do Médico</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                    {formData.foto_url ? (
                      <img src={formData.foto_url} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Stethoscope className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input type="file" accept="image/*" onChange={handleFileUpload} />
                    <Input
                      value={formData.foto_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, foto_url: e.target.value }))}
                      placeholder="ou cole a URL da imagem"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Biografia</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Formação Acadêmica</Label>
                <div className="flex gap-2">
                  <Input
                    value={novaFormacao}
                    onChange={(e) => setNovaFormacao(e.target.value)}
                    placeholder="Ex: Residência em Cardiologia - USP"
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddFormacao())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddFormacao}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.formacao.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.formacao.map((f, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {f}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveFormacao(i)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
                <Switch
                  checked={formData.aparecer_home}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, aparecer_home: checked }))}
                />
                <div>
                  <Label className="font-medium">Aparecer na Home</Label>
                  <p className="text-xs text-muted-foreground">
                    O médico aparecerá no carrossel e nas buscas da landing page
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePerfil} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </div>
            </TabsContent>

            {/* Tab Locais - Mostra apenas o endereço da clínica */}
            <TabsContent value="locais" className="mt-0 space-y-4">
              {loadingLocais ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : !hasClinicaEndereco ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-muted-foreground font-medium">A clínica não possui endereço cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cadastre o endereço da clínica primeiro na seção "Locais" do menu
                  </p>
                </div>
              ) : localClinica ? (
                <Card className={!localAtivo ? "opacity-60" : ""}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{localClinica.nome_local}</h3>
                            <Badge variant={localAtivo ? "default" : "secondary"} className="gap-1">
                              {localAtivo ? <Check className="w-3 h-3" /> : null}
                              {localAtivo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">
                            {localClinica.endereco}
                            {localClinica.cidade && `, ${localClinica.cidade}`}
                            {localClinica.estado && ` - ${localClinica.estado}`}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            Este médico atende no endereço da clínica
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={localAtivo}
                          onCheckedChange={handleToggleLocalAtivo}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Este médico ainda não está vinculado ao endereço da clínica
                  </p>
                  <Card className="max-w-md mx-auto mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-primary mt-0.5" />
                        <div className="text-left">
                          <p className="font-medium">{clinicaData?.nome_fantasia}</p>
                          <p className="text-sm text-muted-foreground">
                            {clinicaData?.endereco_principal}
                            {clinicaData?.cidade && `, ${clinicaData.cidade}`}
                            {clinicaData?.estado && ` - ${clinicaData.estado}`}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Button onClick={handleVincularLocal} disabled={loadingLocais} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Vincular ao Endereço da Clínica
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab Serviços */}
            <TabsContent value="servicos" className="mt-0 space-y-4">
              <div className="flex gap-2">
                <Input
                  value={novoServico}
                  onChange={(e) => setNovoServico(e.target.value)}
                  placeholder="Nome do serviço (ex: Consulta de rotina)"
                  onKeyPress={(e) => e.key === "Enter" && handleAddServico()}
                />
                <Button onClick={handleAddServico} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>

              {loadingServicos ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : servicos.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione serviços que este médico oferece
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {servicos.map((servico) => (
                    <div
                      key={servico.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        !servico.ativo ? "opacity-60 bg-muted/30" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className={!servico.ativo ? "line-through" : ""}>
                          {servico.nome_servico}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={servico.ativo}
                          onCheckedChange={() => handleToggleServicoAtivo(servico)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDeleteServico(servico.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

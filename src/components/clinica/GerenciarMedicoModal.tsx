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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Edit,
  Building2,
  Video,
} from "lucide-react";

const especialidades = [
  "Cardiologia", "Dermatologia", "Endocrinologia", "Gastroenterologia",
  "Ginecologia", "Neurologia", "Oftalmologia", "Ortopedia", "Pediatria",
  "Psiquiatria", "Urologia", "Clínico Geral", "Otorrinolaringologia",
  "Pneumologia", "Reumatologia", "Geriatria", "Medicina do Trabalho",
  "Medicina Esportiva", "Nutrição", "Fisioterapia", "Psicologia"
];

const tiposAtendimento = [
  { value: "presencial", label: "Presencial", icon: Building2 },
  { value: "telemedicina", label: "Telemedicina", icon: Video },
];

interface GerenciarMedicoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medico: any;
  clinicaId: string;
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
  
  // Locais
  const [locais, setLocais] = useState<Local[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [showLocalForm, setShowLocalForm] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [localForm, setLocalForm] = useState({
    nome_local: "",
    tipo_atendimento: "presencial",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
  });
  const [deleteLocalId, setDeleteLocalId] = useState<string | null>(null);
  
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
      fetchLocais();
      fetchServicos();
    }
  }, [open, medico]);

  async function fetchLocais() {
    if (!medico?.id || !clinicaId) return;
    setLoadingLocais(true);
    // Busca apenas locais que pertencem a esta clínica
    const { data } = await supabase
      .from("locais_atendimento")
      .select("*")
      .eq("medico_id", medico.id)
      .eq("clinica_id", clinicaId)
      .order("nome_local");
    setLocais(data || []);
    setLoadingLocais(false);
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

  // Local handlers
  function resetLocalForm() {
    setLocalForm({
      nome_local: "",
      tipo_atendimento: "presencial",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
    });
    setEditingLocal(null);
    setShowLocalForm(false);
  }

  function handleEditLocal(local: Local) {
    setEditingLocal(local);
    setLocalForm({
      nome_local: local.nome_local,
      tipo_atendimento: local.tipo_atendimento,
      endereco: local.endereco || "",
      cidade: local.cidade || "",
      estado: local.estado || "",
      cep: local.cep || "",
    });
    setShowLocalForm(true);
  }

  async function handleSaveLocal() {
    if (!localForm.nome_local.trim()) {
      toast.error("Nome do local é obrigatório");
      return;
    }

    setLoading(true);
    try {
      if (editingLocal) {
        const { error } = await supabase
          .from("locais_atendimento")
          .update({
            nome_local: localForm.nome_local,
            tipo_atendimento: localForm.tipo_atendimento,
            endereco: localForm.endereco || null,
            cidade: localForm.cidade || null,
            estado: localForm.estado || null,
            cep: localForm.cep || null,
          })
          .eq("id", editingLocal.id);

        if (error) throw error;
        toast.success("Local atualizado!");
      } else {
        const { error } = await supabase
          .from("locais_atendimento")
          .insert({
            medico_id: medico.id,
            clinica_id: clinicaId,
            nome_local: localForm.nome_local,
            tipo_atendimento: localForm.tipo_atendimento,
            endereco: localForm.endereco || null,
            cidade: localForm.cidade || null,
            estado: localForm.estado || null,
            cep: localForm.cep || null,
            ativo: true,
          });

        if (error) throw error;
        toast.success("Local adicionado!");
      }
      resetLocalForm();
      fetchLocais();
    } catch (error) {
      toast.error("Erro ao salvar local");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLocalAtivo(local: Local) {
    const { error } = await supabase
      .from("locais_atendimento")
      .update({ ativo: !local.ativo })
      .eq("id", local.id);

    if (error) {
      toast.error("Erro ao atualizar local");
    } else {
      fetchLocais();
    }
  }

  async function handleDeleteLocal() {
    if (!deleteLocalId) return;
    
    const { error } = await supabase
      .from("locais_atendimento")
      .delete()
      .eq("id", deleteLocalId);

    if (error) {
      toast.error("Erro ao excluir local");
    } else {
      toast.success("Local excluído!");
      fetchLocais();
    }
    setDeleteLocalId(null);
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

  return (
    <>
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
                <span className="hidden sm:inline">Locais</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{locais.length}</Badge>
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

              {/* Tab Locais */}
              <TabsContent value="locais" className="mt-0 space-y-4">
                {!showLocalForm ? (
                  <>
                    <Button onClick={() => setShowLocalForm(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar Local
                    </Button>

                    {loadingLocais ? (
                      <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                    ) : locais.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Nenhum local cadastrado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {locais.map((local) => (
                          <Card key={local.id} className={!local.ativo ? "opacity-60" : ""}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-lg bg-primary/10">
                                    {local.tipo_atendimento === "telemedicina" ? (
                                      <Video className="h-5 w-5 text-primary" />
                                    ) : (
                                      <Building2 className="h-5 w-5 text-primary" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium">{local.nome_local}</p>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      {local.tipo_atendimento}
                                    </p>
                                    {local.endereco && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {local.endereco}
                                        {local.cidade && `, ${local.cidade}`}
                                        {local.estado && ` - ${local.estado}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={local.ativo}
                                    onCheckedChange={() => handleToggleLocalAtivo(local)}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditLocal(local)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => setDeleteLocalId(local.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium">
                      {editingLocal ? "Editar Local" : "Novo Local"}
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Nome do Local *</Label>
                        <Input
                          value={localForm.nome_local}
                          onChange={(e) => setLocalForm(prev => ({ ...prev, nome_local: e.target.value }))}
                          placeholder="Ex: Clínica Central, Consultório Particular"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de Atendimento</Label>
                        <Select
                          value={localForm.tipo_atendimento}
                          onValueChange={(v) => setLocalForm(prev => ({ ...prev, tipo_atendimento: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposAtendimento.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>CEP</Label>
                        <Input
                          value={localForm.cep}
                          onChange={(e) => setLocalForm(prev => ({ ...prev, cep: e.target.value }))}
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Endereço</Label>
                        <Input
                          value={localForm.endereco}
                          onChange={(e) => setLocalForm(prev => ({ ...prev, endereco: e.target.value }))}
                          placeholder="Rua, número, complemento"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          value={localForm.cidade}
                          onChange={(e) => setLocalForm(prev => ({ ...prev, cidade: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Input
                          value={localForm.estado}
                          onChange={(e) => setLocalForm(prev => ({ ...prev, estado: e.target.value }))}
                          placeholder="UF"
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={resetLocalForm}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveLocal} disabled={loading}>
                        {loading ? "Salvando..." : editingLocal ? "Atualizar" : "Adicionar"}
                      </Button>
                    </div>
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

      {/* Alert Dialog para excluir local */}
      <AlertDialog open={!!deleteLocalId} onOpenChange={() => setDeleteLocalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Local?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O local será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteLocal}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

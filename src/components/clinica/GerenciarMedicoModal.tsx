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
import { Checkbox } from "@/components/ui/checkbox";
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
  KeyRound,
  Loader2,
} from "lucide-react";
import { hashPassword } from "@/lib/secureAuth";
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

const especialidadesDefault: string[] = [
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
  const [especialidades, setEspecialidades] = useState<string[]>(especialidadesDefault);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [showAddEspecialidade, setShowAddEspecialidade] = useState(false);
  
  // Locais da clínica e vínculos do médico
  const [clinicaLocais, setClinicaLocais] = useState<Local[]>([]);
  const [medicoLocaisIds, setMedicoLocaisIds] = useState<Set<string>>(new Set());
  const [loadingLocais, setLoadingLocais] = useState(false);
  
  // Serviços
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [novoServico, setNovoServico] = useState("");

  // Redefinir senha
  const [resetSenhaDialogOpen, setResetSenhaDialogOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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
    
    // Fetch all locais for this clinic
    const { data: locaisData } = await supabase
      .from("locais_atendimento")
      .select("id, nome_local, tipo_atendimento, endereco, cidade, estado, cep, ativo")
      .eq("clinica_id", clinicaId)
      .order("nome_local");
    
    setClinicaLocais(locaisData || []);

    // Fetch which locais this doctor is linked to
    const { data: linksData } = await supabase
      .from("locais_medicos")
      .select("local_id")
      .eq("medico_id", medico.id);
    
    const linkedIds = new Set((linksData || []).map(l => l.local_id));
    setMedicoLocaisIds(linkedIds);
    setLoadingLocais(false);
  }

  async function handleToggleLocal(localId: string) {
    if (!medico?.id) return;
    
    const isLinked = medicoLocaisIds.has(localId);
    
    if (isLinked) {
      // Remove link
      const { error } = await supabase
        .from("locais_medicos")
        .delete()
        .eq("local_id", localId)
        .eq("medico_id", medico.id);
      
      if (error) {
        toast.error("Erro ao desvincular local");
        return;
      }
      setMedicoLocaisIds(prev => {
        const next = new Set(prev);
        next.delete(localId);
        return next;
      });
      toast.success("Médico desvinculado do local");
    } else {
      // Add link
      const { error } = await supabase
        .from("locais_medicos")
        .insert({ local_id: localId, medico_id: medico.id, ativo: true });
      
      if (error) {
        toast.error("Erro ao vincular local");
        return;
      }
      setMedicoLocaisIds(prev => new Set(prev).add(localId));
      toast.success("Médico vinculado ao local!");
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

  async function handleResetPassword() {
    if (!medico?.usuario_id) {
      toast.error("Médico não possui usuário vinculado");
      return;
    }
    setResettingPassword(true);
    try {
      const result = await hashPassword("123456");
      if (result.error || !result.hash) {
        throw new Error(result.error || "Erro ao gerar hash");
      }
      const { error } = await supabase
        .from("usuarios")
        .update({ senha_hash: result.hash, deve_trocar_senha: true })
        .eq("id", medico.usuario_id);
      if (error) throw error;
      toast.success("Senha redefinida para 123456. O médico será solicitado a trocar no próximo login.");
      setResetSenhaDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    } finally {
      setResettingPassword(false);
    }
  }

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

  const linkedCount = medicoLocaisIds.size;

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
              <span className="hidden sm:inline">Locais</span>
              {linkedCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{linkedCount}</Badge>}
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
                  <div className="flex gap-2">
                    <Select
                      value={formData.especialidade}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, especialidade: value }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {especialidades.sort().map((esp) => (
                          <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddEspecialidade(true)}
                      title="Adicionar nova especialidade"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {showAddEspecialidade && (
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={novaEspecialidade}
                        onChange={(e) => setNovaEspecialidade(e.target.value)}
                        placeholder="Nova especialidade..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (novaEspecialidade.trim()) {
                            if (!especialidades.includes(novaEspecialidade.trim())) {
                              setEspecialidades([...especialidades, novaEspecialidade.trim()]);
                              setFormData(prev => ({ ...prev, especialidade: novaEspecialidade.trim() }));
                              toast.success("Especialidade adicionada!");
                            } else {
                              toast.error("Especialidade já existe");
                            }
                            setNovaEspecialidade("");
                            setShowAddEspecialidade(false);
                          }
                        }}
                      >
                        Adicionar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setNovaEspecialidade("");
                          setShowAddEspecialidade(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
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

              {/* Redefinir Senha */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Redefinir Senha</p>
                      <p className="text-xs text-muted-foreground">
                        Redefine a senha para 123456. O médico será obrigado a trocar no próximo login.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetSenhaDialogOpen(true)}
                    className="gap-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Redefinir
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePerfil} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Perfil"}
                </Button>
              </div>

              {/* Alert Dialog de confirmação */}
              <AlertDialog open={resetSenhaDialogOpen} onOpenChange={setResetSenhaDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Redefinir senha do médico?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A senha de <strong>{medico?.nome}</strong> será redefinida para <strong>123456</strong>. 
                      O médico será obrigado a criar uma nova senha no próximo login.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={resettingPassword}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPassword} disabled={resettingPassword}>
                      {resettingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redefinindo...
                        </>
                      ) : (
                        "Confirmar Redefinição"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            {/* Tab Locais - Checkbox para vincular/desvincular dos locais da clínica */}
            <TabsContent value="locais" className="mt-0 space-y-4">
              {loadingLocais ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : clinicaLocais.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <p className="text-muted-foreground font-medium">Nenhum local cadastrado na clínica</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cadastre locais de atendimento primeiro na seção "Locais" do menu
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Selecione os locais onde este médico atende:
                  </p>
                  {clinicaLocais.map((local) => (
                    <Card key={local.id} className={!local.ativo ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`local-${local.id}`}
                            checked={medicoLocaisIds.has(local.id)}
                            onCheckedChange={() => handleToggleLocal(local.id)}
                            className="mt-1"
                          />
                          <label htmlFor={`local-${local.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="w-4 h-4 text-primary" />
                              <span className="font-medium">{local.nome_local}</span>
                              <Badge variant={local.ativo ? "default" : "secondary"} className="text-xs">
                                {local.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {local.tipo_atendimento === "telemedicina" ? "Telemedicina" : "Presencial"}
                              </Badge>
                            </div>
                            {local.endereco && (
                              <p className="text-sm text-muted-foreground">
                                {local.endereco}
                                {local.cidade && `, ${local.cidade}`}
                                {local.estado && ` - ${local.estado}`}
                              </p>
                            )}
                          </label>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {linkedCount} local(is) vinculado(s) a este médico
                  </p>
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

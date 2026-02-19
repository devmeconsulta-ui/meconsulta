import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Search, Stethoscope, ExternalLink, Trash2, UserPlus, 
  Edit, Globe, Calendar, FileText, Upload, X, Eye, Home, Settings
} from "lucide-react";
import { toast } from "sonner";
import { GerenciarMedicoModal } from "@/components/clinica/GerenciarMedicoModal";

const especialidadesDefault: string[] = [
  "Cardiologia", "Dermatologia", "Endocrinologia", "Gastroenterologia",
  "Ginecologia", "Neurologia", "Oftalmologia", "Ortopedia", "Pediatria",
  "Psiquiatria", "Urologia", "Clínico Geral", "Otorrinolaringologia",
  "Pneumologia", "Reumatologia", "Geriatria", "Medicina do Trabalho",
  "Medicina Esportiva", "Nutrição", "Fisioterapia", "Psicologia"
];

export default function ClinicaMedicos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clinicaData } = useOutletContext<{ clinicaData: any }>();
  const [search, setSearch] = useState("");
  const [searchNew, setSearchNew] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cadastroDialogOpen, setCadastroDialogOpen] = useState(false);
  const [gerenciarDialogOpen, setGerenciarDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedicoToDelete, setSelectedMedicoToDelete] = useState<string | null>(null);
  const [selectedMedicoToGerenciar, setSelectedMedicoToGerenciar] = useState<any>(null);
  const [selectedMedicoToEdit, setSelectedMedicoToEdit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("vinculados");
  const [especialidades, setEspecialidades] = useState<string[]>(especialidadesDefault);
  const [novaEspecialidade, setNovaEspecialidade] = useState("");
  const [showAddEspecialidade, setShowAddEspecialidade] = useState(false);
  const [showAddEspecialidadeEdit, setShowAddEspecialidadeEdit] = useState(false);

  // Form state para cadastro - senha padrão 123456
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "123456", // Senha padrão
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

  // Form state para edição de página pública
  const [editFormData, setEditFormData] = useState({
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
  const [editNovaFormacao, setEditNovaFormacao] = useState("");

  // Médicos vinculados
  const { data: medicos, isLoading } = useQuery({
    queryKey: ["clinica-medicos", clinicaData?.id],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const { data, error } = await supabase
        .from("clinicas_medicos")
        .select(`
          id,
          ativo,
          medico:medicos(
            id,
            nome,
            especialidade,
            crm,
            foto_url,
            valor_consulta,
            ativo,
            aparecer_home,
            bio,
            formacao,
            telefone_whatsapp,
            usuario_id
          )
        `)
        .eq("clinica_id", clinicaData.id);

      if (error) throw error;
      
      // Fetch emails from usuarios table for each doctor
      const items = data || [];
      const usuarioIds = items
        .map((m: any) => m.medico?.usuario_id)
        .filter(Boolean);
      
      if (usuarioIds.length > 0) {
        const { data: usuarios } = await supabase
          .from("usuarios")
          .select("id, email")
          .in("id", usuarioIds);
        
        const emailMap = new Map((usuarios || []).map((u: any) => [u.id, u.email]));
        
        return items.map((item: any) => ({
          ...item,
          medico: item.medico ? {
            ...item.medico,
            email: emailMap.get(item.medico.usuario_id) || null,
          } : item.medico,
        }));
      }
      
      return items;
    },
    enabled: !!clinicaData?.id,
  });

  // Médicos disponíveis para vincular (não vinculados ainda)
  const { data: medicosDisponiveis, isLoading: loadingDisponiveis } = useQuery({
    queryKey: ["medicos-disponiveis", clinicaData?.id, searchNew],
    queryFn: async () => {
      if (!clinicaData?.id) return [];

      const vinculadosIds = medicos?.map((m: any) => m.medico?.id).filter(Boolean) || [];

      let query = supabase
        .from("medicos")
        .select("id, nome, especialidade, crm, foto_url, valor_consulta")
        .eq("ativo", true)
        .order("nome");

      if (vinculadosIds.length > 0) {
        query = query.not("id", "in", `(${vinculadosIds.join(",")})`);
      }

      if (searchNew.trim()) {
        query = query.or(`nome.ilike.%${searchNew}%,especialidade.ilike.%${searchNew}%,crm.ilike.%${searchNew}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicaData?.id && dialogOpen,
  });

  // Cadastrar novo médico
  const cadastrarMedicoMutation = useMutation({
    mutationFn: async () => {
      if (!formData.senha || formData.senha.length < 4) {
        throw new Error("Senha deve ter pelo menos 4 caracteres");
      }

      // Criar usuário com senha
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .insert({
          nome: formData.nome,
          email: formData.email,
          senha_hash: formData.senha,
          tipo: "medico",
          papel: "medico",
          ativo: true,
          deve_trocar_senha: true,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Criar médico
      const { data: medico, error: medicoError } = await supabase
        .from("medicos")
        .insert({
          nome: formData.nome,
          especialidade: formData.especialidade,
          crm: formData.crm,
          telefone_whatsapp: formData.telefone_whatsapp,
          valor_consulta: parseFloat(formData.valor_consulta) || 0,
          bio: formData.bio,
          formacao: formData.formacao,
          foto_url: formData.foto_url,
          aparecer_home: formData.aparecer_home,
          usuario_id: usuario.id,
          ativo: true,
        })
        .select()
        .single();

      if (medicoError) throw medicoError;

      // Vincular à clínica
      const { error: vinculoError } = await supabase
        .from("clinicas_medicos")
        .insert({
          clinica_id: clinicaData.id,
          medico_id: medico.id,
          ativo: true,
        });

      if (vinculoError) throw vinculoError;

      return medico;
    },
    onSuccess: () => {
      toast.success("Médico cadastrado e vinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
      setCadastroDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar médico");
    },
  });

  // Atualizar página pública do médico
  const atualizarMedicoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("medicos")
        .update({
          nome: editFormData.nome,
          especialidade: editFormData.especialidade,
          crm: editFormData.crm,
          telefone_whatsapp: editFormData.telefone_whatsapp,
          valor_consulta: parseFloat(editFormData.valor_consulta) || 0,
          bio: editFormData.bio,
          formacao: editFormData.formacao,
          foto_url: editFormData.foto_url,
          aparecer_home: editFormData.aparecer_home,
        })
        .eq("id", selectedMedicoToEdit?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Página pública atualizada!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
      setEditDialogOpen(false);
      setSelectedMedicoToEdit(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar médico");
    },
  });

  // Vincular médico existente
  const vincularMutation = useMutation({
    mutationFn: async (medicoId: string) => {
      const { error } = await supabase.from("clinicas_medicos").insert({
        clinica_id: clinicaData.id,
        medico_id: medicoId,
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Médico vinculado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
      queryClient.invalidateQueries({ queryKey: ["medicos-disponiveis"] });
      setDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao vincular médico");
    },
  });

  // Toggle ativo/inativo
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("clinicas_medicos")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Toggle aparecer na home
  const toggleHomeMutation = useMutation({
    mutationFn: async ({ medicoId, aparecer }: { medicoId: string; aparecer: boolean }) => {
      const { error } = await supabase
        .from("medicos")
        .update({ aparecer_home: aparecer })
        .eq("id", medicoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visibilidade na home atualizada!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar visibilidade");
    },
  });

  // Desvincular médico
  const desvincularMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clinicas_medicos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Médico desvinculado!");
      queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
      setDeleteDialogOpen(false);
      setSelectedMedicoToDelete(null);
    },
    onError: () => {
      toast.error("Erro ao desvincular médico");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      senha: "123456", // Senha padrão
      especialidade: "",
      crm: "",
      telefone_whatsapp: "",
      valor_consulta: "",
      bio: "",
      formacao: [],
      foto_url: "",
      aparecer_home: false,
    });
    setNovaFormacao("");
  };

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

  const handleEditAddFormacao = () => {
    if (editNovaFormacao.trim()) {
      setEditFormData(prev => ({
        ...prev,
        formacao: [...prev.formacao, editNovaFormacao.trim()]
      }));
      setEditNovaFormacao("");
    }
  };

  const handleEditRemoveFormacao = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      formacao: prev.formacao.filter((_, i) => i !== index)
    }));
  };

  const openEditDialog = (medico: any) => {
    setSelectedMedicoToEdit(medico);
    setEditFormData({
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
    setEditDialogOpen(true);
  };

  const filteredMedicos = medicos?.filter((m: any) =>
    m.medico?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.medico?.especialidade?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Médicos</h1>
          <p className="text-muted-foreground">
            Cadastre, vincule e gerencie os médicos da clínica.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={cadastroDialogOpen} onOpenChange={setCadastroDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Cadastrar Médico
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Cadastrar Novo Médico
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Dr. João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha Inicial</Label>
                    <Input
                      type="text"
                      value={formData.senha}
                      onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                      placeholder="123456"
                    />
                    <p className="text-xs text-muted-foreground">Senha padrão: 123456. O médico será solicitado a trocar no primeiro login.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade *</Label>
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
                    <Label>CRM *</Label>
                    <Input
                      value={formData.crm}
                      onChange={(e) => setFormData(prev => ({ ...prev, crm: e.target.value }))}
                      placeholder="12345-SP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={formData.telefone_whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone_whatsapp: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor da Consulta *</Label>
                    <Input
                      type="number"
                      value={formData.valor_consulta}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_consulta: e.target.value }))}
                      placeholder="150.00"
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
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast.error("Arquivo muito grande. Máximo 2MB.");
                            return;
                          }
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                          const { data, error } = await supabase.storage
                            .from('fotos-medicos')
                            .upload(fileName, file);
                          if (error) {
                            toast.error("Erro ao fazer upload da foto");
                            return;
                          }
                          const { data: urlData } = supabase.storage.from('fotos-medicos').getPublicUrl(fileName);
                          setFormData(prev => ({ ...prev, foto_url: urlData.publicUrl }));
                          toast.success("Foto enviada!");
                        }}
                      />
                      <p className="text-xs text-muted-foreground">ou cole a URL da imagem:</p>
                      <Input
                        value={formData.foto_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, foto_url: e.target.value }))}
                        placeholder="https://exemplo.com/foto.jpg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Biografia</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Breve descrição profissional..."
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
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => handleRemoveFormacao(i)} 
                          />
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setCadastroDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => cadastrarMedicoMutation.mutate()}
                    disabled={cadastrarMedicoMutation.isPending || !formData.nome || !formData.email || !formData.especialidade || !formData.crm || !formData.valor_consulta}
                  >
                    {cadastrarMedicoMutation.isPending ? "Cadastrando..." : "Cadastrar Médico"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Vincular Existente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Vincular Médico Existente
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, especialidade ou CRM..."
                    value={searchNew}
                    onChange={(e) => setSearchNew(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {loadingDisponiveis ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Buscando médicos...
                  </div>
                ) : medicosDisponiveis?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum médico disponível encontrado</p>
                    <p className="text-xs mt-1">Todos os médicos já estão vinculados ou não há médicos cadastrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medicosDisponiveis?.map((medico: any) => (
                      <Card key={medico.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                {medico.foto_url ? (
                                  <img 
                                    src={medico.foto_url} 
                                    alt={medico.nome}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  <Stethoscope className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{medico.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {medico.especialidade} • CRM: {medico.crm}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => vincularMutation.mutate(medico.id)}
                              disabled={vincularMutation.isPending}
                            >
                              Vincular
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredMedicos?.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum médico cadastrado ou vinculado ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Cadastrar Médico" para adicionar um novo
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMedicos?.map((item: any) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {item.medico?.foto_url ? (
                          <img 
                            src={item.medico.foto_url} 
                            alt={item.medico.nome}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Stethoscope className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{item.medico?.nome}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.medico?.especialidade}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CRM: {item.medico?.crm}
                        </p>
                        {item.medico?.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            ✉ {item.medico.email}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <Badge variant={item.ativo ? "default" : "secondary"}>
                            {item.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          {item.medico?.aparecer_home && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Home className="h-3 w-3" />
                              Home
                            </Badge>
                          )}
                          <span className="text-sm font-medium text-primary">
                            R$ {item.medico?.valor_consulta?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Toggle Ativo na Clínica */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.ativo}
                            onCheckedChange={(checked) => 
                              toggleAtivoMutation.mutate({ id: item.id, ativo: checked })
                            }
                          />
                          <Label className="text-xs text-muted-foreground">
                            Ativo na clínica
                          </Label>
                        </div>
                      </div>

                      {/* Toggle Aparecer na Home */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.medico?.aparecer_home || false}
                            onCheckedChange={(checked) => 
                              toggleHomeMutation.mutate({ medicoId: item.medico?.id, aparecer: checked })
                            }
                          />
                          <Label className="text-xs text-muted-foreground">
                            Aparecer na Home
                          </Label>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => {
                            setSelectedMedicoToGerenciar(item.medico);
                            setGerenciarDialogOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                          Gerenciar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/medico/${item.medico?.id}`)}
                          title="Ver página pública"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedMedicoToDelete(item.id);
                            setDeleteDialogOpen(true);
                          }}
                          title="Desvincular médico"
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
        </CardContent>
      </Card>

      {/* Dialog Editar Página Pública */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Editar Página Pública - {selectedMedicoToEdit?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={editFormData.nome}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <div className="flex gap-2">
                  <Select
                    value={editFormData.especialidade}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, especialidade: value }))}
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
                    onClick={() => setShowAddEspecialidadeEdit(true)}
                    title="Adicionar nova especialidade"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {showAddEspecialidadeEdit && (
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
                            setEditFormData(prev => ({ ...prev, especialidade: novaEspecialidade.trim() }));
                            toast.success("Especialidade adicionada!");
                          } else {
                            toast.error("Especialidade já existe");
                          }
                          setNovaEspecialidade("");
                          setShowAddEspecialidadeEdit(false);
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
                        setShowAddEspecialidadeEdit(false);
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
                  value={editFormData.crm}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, crm: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={editFormData.telefone_whatsapp}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, telefone_whatsapp: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Valor da Consulta</Label>
                <Input
                  type="number"
                  value={editFormData.valor_consulta}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, valor_consulta: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foto do Médico</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                  {editFormData.foto_url ? (
                    <img src={editFormData.foto_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Stethoscope className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("Arquivo muito grande. Máximo 2MB.");
                        return;
                      }
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                      const { data, error } = await supabase.storage
                        .from('fotos-medicos')
                        .upload(fileName, file);
                      if (error) {
                        toast.error("Erro ao fazer upload da foto");
                        return;
                      }
                      const { data: urlData } = supabase.storage.from('fotos-medicos').getPublicUrl(fileName);
                      setEditFormData(prev => ({ ...prev, foto_url: urlData.publicUrl }));
                      toast.success("Foto enviada!");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">ou cole a URL da imagem:</p>
                  <Input
                    value={editFormData.foto_url}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, foto_url: e.target.value }))}
                    placeholder="https://exemplo.com/foto.jpg"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Biografia</Label>
              <Textarea
                value={editFormData.bio}
                onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Formação Acadêmica</Label>
              <div className="flex gap-2">
                <Input
                  value={editNovaFormacao}
                  onChange={(e) => setEditNovaFormacao(e.target.value)}
                  placeholder="Ex: Residência em Cardiologia - USP"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleEditAddFormacao())}
                />
                <Button type="button" variant="outline" onClick={handleEditAddFormacao}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {editFormData.formacao.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editFormData.formacao.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {f}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleEditRemoveFormacao(i)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <Switch
                checked={editFormData.aparecer_home}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, aparecer_home: checked }))}
              />
              <div>
                <Label className="font-medium">Aparecer na Home</Label>
                <p className="text-xs text-muted-foreground">
                  O médico aparecerá no carrossel e nas buscas da landing page
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => atualizarMedicoMutation.mutate()}
                disabled={atualizarMedicoMutation.isPending}
              >
                {atualizarMedicoMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Médico?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá remover o vínculo do médico com a clínica. O médico continuará existindo no sistema, mas não aparecerá mais na sua lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedMedicoToDelete && desvincularMutation.mutate(selectedMedicoToDelete)}
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Gerenciar Médico */}
      <GerenciarMedicoModal
        open={gerenciarDialogOpen}
        onOpenChange={setGerenciarDialogOpen}
        medico={selectedMedicoToGerenciar}
        clinicaId={clinicaData?.id}
        clinicaData={clinicaData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["clinica-medicos"] });
        }}
      />
    </div>
  );
}

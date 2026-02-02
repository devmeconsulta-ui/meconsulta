import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreVertical,
  User,
  Phone,
  Mail,
  Edit,
  Trash2,
  MessageSquare,
  Link2,
  Loader2,
  Upload,
  Download,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { ImportarContatosModal } from "@/components/clinica/omnichannel/ImportarContatosModal";
import { VincularPacienteModal } from "@/components/clinica/omnichannel/VincularPacienteModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

interface OmniContato {
  id: string;
  clinica_id: string;
  nome: string;
  telefone: string;
  documento: string | null;
  email: string | null;
  instagram: string | null;
  foto_url: string | null;
  etiquetas: string[];
  empresa: string | null;
  observacoes: string | null;
  paciente_id: string | null;
  created_at: string;
}

export default function OmniContatos() {
  const { clinicaData, currentUser } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [showNovoContato, setShowNovoContato] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingContato, setEditingContato] = useState<OmniContato | null>(null);
  const [vincularContato, setVincularContato] = useState<OmniContato | null>(null);
  const [creatingConversa, setCreatingConversa] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    documento: "",
    email: "",
    instagram: "",
    empresa: "",
    observacoes: "",
  });

  // Criar nova conversa/atendimento
  const handleNovaConversa = async (contato: OmniContato) => {
    if (!clinicaId || !currentUser) {
      toast.error("Erro ao criar conversa");
      return;
    }

    setCreatingConversa(contato.id);
    try {
      // Check if there's already an open atendimento for this contact
      const existingResult = await (supabase
        .from("omni_atendimentos")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("contato_id", contato.id)
        .in("status", ["aguardando", "em_atendimento"])
        .maybeSingle() as unknown as Promise<{ data: { id: string } | null; error: Error | null }>);

      if (existingResult.data) {
        toast.info("Atendimento já existe, abrindo conversa...");
        navigate(`/clinica/omnichannel/atendimentos?atendimento=${existingResult.data.id}`);
        return;
      }

      // Get the usuarios_clinica record for the current user
      let agenteId: string | null = null;
      
      // @ts-ignore - Supabase type instantiation issue
      const ucResult = await supabase.from("usuarios_clinica").select("id").eq("clinica_id", clinicaId).eq("usuario_id", currentUser.id);
      
      if (ucResult.data && ucResult.data.length > 0) {
        agenteId = (ucResult.data[0] as any).id;
      }

      // Create new atendimento
      const insertResult = await (supabase
        .from("omni_atendimentos")
        .insert({
          clinica_id: clinicaId,
          contato_id: contato.id,
          agente_id: agenteId,
          status: agenteId ? "em_atendimento" : "aguardando",
          canal: "whatsapp",
          prioridade: "normal",
          data_abertura: new Date().toISOString(),
        })
        .select("id")
        .single() as unknown as Promise<{ data: { id: string } | null; error: Error | null }>);

      if (insertResult.error) throw insertResult.error;
      if (!insertResult.data) throw new Error("No data returned");

      toast.success("Conversa iniciada!");
      navigate(`/clinica/omnichannel/atendimentos?atendimento=${insertResult.data.id}`);
    } catch (err) {
      console.error("Error creating atendimento:", err);
      toast.error("Erro ao criar conversa");
    } finally {
      setCreatingConversa(null);
    }
  };

  // Ver paciente vinculado
  const handleVerPaciente = (pacienteId: string) => {
    navigate(`/clinica/pacientes?paciente=${pacienteId}`);
  };

  // Export function
  const handleExportContatos = () => {
    if (contatos.length === 0) {
      toast.error("Não há contatos para exportar");
      return;
    }

    const exportData = contatos.map(c => ({
      "Nome": c.nome,
      "Telefone": c.telefone,
      "CPF/CNPJ": c.documento || "",
      "E-mail": c.email || "",
      "Instagram": c.instagram || "",
      "Empresa": c.empresa || "",
      "Observações": c.observacoes || "",
      "Data Cadastro": format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR }),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const colWidths = Object.keys(exportData[0]).map(k => ({ wch: Math.max(k.length + 2, 18) }));
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contatos");
    
    XLSX.writeFile(workbook, `contatos_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Contatos exportados com sucesso!");
  };

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ["omni-contatos", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      const { data, error } = await supabase
        .from("omni_contatos")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OmniContato[];
    },
    enabled: !!clinicaId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<OmniContato>) => {
      const insertData = {
        clinica_id: clinicaId!,
        nome: data.nome || "",
        telefone: data.telefone || "",
        documento: data.documento,
        email: data.email,
        instagram: data.instagram,
        empresa: data.empresa,
        observacoes: data.observacoes,
      };
      const { error } = await supabase.from("omni_contatos").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-contatos"] });
      toast.success("Contato criado com sucesso");
      setShowNovoContato(false);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao criar contato");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OmniContato> }) => {
      const { error } = await supabase.from("omni_contatos").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-contatos"] });
      toast.success("Contato atualizado com sucesso");
      setEditingContato(null);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao atualizar contato");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("omni_contatos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omni-contatos"] });
      toast.success("Contato excluído com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir contato");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      telefone: "",
      documento: "",
      email: "",
      instagram: "",
      empresa: "",
      observacoes: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.nome || !formData.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    if (editingContato) {
      updateMutation.mutate({ id: editingContato.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (contato: OmniContato) => {
    setEditingContato(contato);
    setFormData({
      nome: contato.nome,
      telefone: contato.telefone,
      documento: contato.documento || "",
      email: contato.email || "",
      instagram: contato.instagram || "",
      empresa: contato.empresa || "",
      observacoes: contato.observacoes || "",
    });
  };

  const filteredContatos = contatos.filter((c) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(search) ||
      c.telefone.includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.documento?.includes(search)
    );
  });

  if (isLoading) {
    return (
      <OmniLayout clinicaId={clinicaId || undefined}>
        <div className="flex items-center justify-center h-[calc(100vh-250px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </OmniLayout>
    );
  }

  return (
    <OmniLayout clinicaId={clinicaId || undefined}>
      {/* Conteúdo */}
      <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Contatos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie os contatos do atendimento
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportContatos} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)} className="flex-1 sm:flex-none">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        <Dialog
          open={showNovoContato || !!editingContato}
          onOpenChange={(open) => {
            if (!open) {
              setShowNovoContato(false);
              setEditingContato(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setShowNovoContato(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContato ? "Editar Contato" : "Novo Contato"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome do contato"
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                  placeholder="5511999999999"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={formData.documento}
                    onChange={(e) =>
                      setFormData({ ...formData, documento: e.target.value })
                    }
                    placeholder="Documento"
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={formData.instagram}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram: e.target.value })
                    }
                    placeholder="@usuario"
                  />
                </div>
                <div>
                  <Label>Empresa</Label>
                  <Input
                    value={formData.empresa}
                    onChange={(e) =>
                      setFormData({ ...formData, empresa: e.target.value })
                    }
                    placeholder="Nome da empresa"
                  />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Input
                  value={formData.observacoes}
                  onChange={(e) =>
                    setFormData({ ...formData, observacoes: e.target.value })
                  }
                  placeholder="Observações adicionais"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNovoContato(false);
                    setEditingContato(null);
                    resetForm();
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingContato ? "Salvar" : "Criar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Modal de Importação */}
      {clinicaId && (
        <ImportarContatosModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          clinicaId={clinicaId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["omni-contatos"] });
            setShowImportModal(false);
          }}
        />
      )}

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, e-mail ou documento..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela - versão mobile com cards */}
      <Card>
        <CardContent className="p-0">
          {/* Mobile: Card view */}
          <div className="sm:hidden divide-y">
            {filteredContatos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum contato encontrado</p>
              </div>
            ) : (
              filteredContatos.map((contato) => (
                <div key={contato.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {contato.foto_url ? (
                          <img
                            src={contato.foto_url}
                            alt={contato.nome}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{contato.nome}</p>
                        <p className="text-sm text-muted-foreground">{contato.telefone}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(contato)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleNovaConversa(contato)}
                          disabled={creatingConversa === contato.id}
                        >
                          {creatingConversa === contato.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MessageSquare className="h-4 w-4 mr-2" />
                          )}
                          Nova Conversa
                        </DropdownMenuItem>
                        {contato.paciente_id ? (
                          <DropdownMenuItem onClick={() => handleVerPaciente(contato.paciente_id!)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver Paciente
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setVincularContato(contato)}>
                            <Link2 className="h-4 w-4 mr-2" />
                            Vincular Paciente
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(contato.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {contato.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contato.email}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Desktop: Table view */}
          <Table className="hidden sm:table">
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContatos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum contato encontrado
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContatos.map((contato) => (
                  <TableRow key={contato.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {contato.foto_url ? (
                            <img
                              src={contato.foto_url}
                              alt={contato.nome}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{contato.nome}</p>
                            {contato.paciente_id && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Vinculado
                              </Badge>
                            )}
                          </div>
                          {contato.documento && (
                            <p className="text-xs text-muted-foreground">
                              {contato.documento}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {contato.telefone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contato.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {contato.email}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contato.empresa || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(contato.created_at), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(contato)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleNovaConversa(contato)}
                            disabled={creatingConversa === contato.id}
                          >
                            {creatingConversa === contato.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-2" />
                            )}
                            Nova Conversa
                          </DropdownMenuItem>
                          {contato.paciente_id ? (
                            <DropdownMenuItem onClick={() => handleVerPaciente(contato.paciente_id!)}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Ver Paciente
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => setVincularContato(contato)}>
                              <Link2 className="h-4 w-4 mr-2" />
                              Vincular Paciente
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(contato.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Vincular Paciente */}
      {vincularContato && (
        <VincularPacienteModal
          isOpen={!!vincularContato}
          onClose={() => setVincularContato(null)}
          contatoId={vincularContato.id}
          contatoNome={vincularContato.nome}
          currentPacienteId={vincularContato.paciente_id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["omni-contatos"] });
            setVincularContato(null);
          }}
        />
      )}
      </div>
    </OmniLayout>
  );
}

import { useEffect, useState } from "react";
import { CrmLead, useCrmClinica } from "@/hooks/useCrmClinica";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Check, X, Trash2, Phone, Mail, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface CrmLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: CrmLead | null;
  etapaId: string | null;
  clinicaId: string | null;
  funilId: string | null;
  onGanho: (id: string) => void;
  onPerdido: (id: string, motivo?: string) => void;
  onExcluir: (id: string) => void;
}

export default function CrmLeadModal({
  open,
  onOpenChange,
  lead,
  etapaId,
  clinicaId,
  funilId,
  onGanho,
  onPerdido,
  onExcluir,
}: CrmLeadModalProps) {
  const { etapas, criarLead, atualizarLead } = useCrmClinica(clinicaId);
  
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [etapaSelecionada, setEtapaSelecionada] = useState<string>("");
  
  const [showPerdidoDialog, setShowPerdidoDialog] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (lead) {
      setNome(lead.nome);
      setTelefone(lead.telefone || "");
      setEmail(lead.email || "");
      setValorEstimado(lead.valor_estimado?.toString() || "");
      setDataVencimento(lead.data_vencimento || "");
      setObservacoes(lead.observacoes || "");
      setEtapaSelecionada(lead.etapa_id);
    } else {
      setNome("");
      setTelefone("");
      setEmail("");
      setValorEstimado("");
      setDataVencimento("");
      setObservacoes("");
      setEtapaSelecionada(etapaId || (etapas[0]?.id || ""));
    }
  }, [lead, etapaId, etapas, open]);

  const handleSave = () => {
    if (!nome.trim()) return;

    const dados = {
      nome,
      telefone: telefone || null,
      email: email || null,
      valor_estimado: parseFloat(valorEstimado) || 0,
      data_vencimento: dataVencimento || null,
      observacoes: observacoes || null,
      etapa_id: etapaSelecionada,
    };

    if (lead) {
      atualizarLead.mutate({ id: lead.id, ...dados });
    } else {
      criarLead.mutate(dados);
    }
    onOpenChange(false);
  };

  const handleGanho = () => {
    if (lead) {
      onGanho(lead.id);
      onOpenChange(false);
    }
  };

  const handlePerdido = () => {
    if (lead) {
      onPerdido(lead.id, motivoPerda);
      setShowPerdidoDialog(false);
      onOpenChange(false);
    }
  };

  const handleExcluir = () => {
    if (lead) {
      onExcluir(lead.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lead ? "Detalhes do Lead" : "Novo Lead"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
              <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome*</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do lead"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    <Phone className="h-3 w-3 inline mr-1" />
                    Telefone
                  </Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-3 w-3 inline mr-1" />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor">
                    <DollarSign className="h-3 w-3 inline mr-1" />
                    Valor Estimado
                  </Label>
                  <Input
                    id="valor"
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vencimento">Data de Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="etapa">Etapa</Label>
                <Select
                  value={etapaSelecionada}
                  onValueChange={setEtapaSelecionada}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.map((etapa) => (
                      <SelectItem key={etapa.id} value={etapa.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: etapa.cor }}
                          />
                          {etapa.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Anotações sobre o lead..."
                  rows={3}
                />
              </div>

              {lead && (
                <div className="text-xs text-muted-foreground">
                  Criado em: {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}
                  {lead.origem === "online" && " • Origem: Online"}
                  {lead.origem === "manual" && " • Origem: Manual"}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="mt-4">
              <div className="text-center text-muted-foreground py-8">
                <p>Histórico de movimentações em breve</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {lead && (
              <div className="flex gap-2 mr-auto">
                <Button
                  variant="outline"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={handleGanho}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Ganho
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowPerdidoDialog(true)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Perdido
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!nome.trim() || criarLead.isPending || atualizarLead.isPending}
            >
              {lead ? "Salvar" : "Criar Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Perdido */}
      <AlertDialog open={showPerdidoDialog} onOpenChange={setShowPerdidoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Perdido</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da perda (opcional):
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={motivoPerda}
            onChange={(e) => setMotivoPerda(e.target.value)}
            placeholder="Ex: Preço alto, escolheu concorrente..."
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePerdido} className="bg-red-600 hover:bg-red-700">
              Confirmar Perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Excluir */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

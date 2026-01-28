import { useState, useEffect } from "react";
import { OmniHeader } from "@/components/clinica/omnichannel/OmniHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OmniInstancia {
  id: string;
  clinica_id: string;
  nome: string;
  evolution_instance_name: string;
  status: string;
  numero_whatsapp: string | null;
  webhook_url: string | null;
  created_at: string;
}

export default function OmniInstancias() {
  const { currentUser } = useAuth();
  const clinicaId = currentUser?.clinicaId;
  const [instancias, setInstancias] = useState<OmniInstancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInstancia, setSelectedInstancia] = useState<OmniInstancia | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formNome, setFormNome] = useState("");

  useEffect(() => {
    if (clinicaId) {
      fetchInstancias();
    }
  }, [clinicaId]);

  const fetchInstancias = async () => {
    if (!clinicaId) return;

    try {
      const { data, error } = await supabase
        .from("omni_instancias")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInstancias((data || []) as OmniInstancia[]);
    } catch (error) {
      console.error("Error fetching instancias:", error);
      toast.error("Erro ao carregar instâncias");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstancia = async () => {
    if (!clinicaId || !formNome.trim()) {
      toast.error("Preencha o nome da instância");
      return;
    }

    setActionLoading("create");
    try {
      const response = await supabase.functions.invoke("evolution-create-instance", {
        body: { clinica_id: clinicaId, nome: formNome.trim() },
      });

      if (response.error) throw response.error;

      toast.success("Instância criada com sucesso!");
      setShowCreateModal(false);
      setFormNome("");
      await fetchInstancias();
    } catch (error: any) {
      console.error("Error creating instancia:", error);
      toast.error(error.message || "Erro ao criar instância");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnect = async (instancia: OmniInstancia) => {
    setActionLoading(instancia.id);
    setSelectedInstancia(instancia);
    setQrCode(null);
    setPairingCode(null);

    try {
      const response = await supabase.functions.invoke("evolution-connect-instance", {
        body: { instancia_id: instancia.id },
      });

      if (response.error) throw response.error;

      if (response.data?.qrcode) {
        setQrCode(response.data.qrcode);
        setPairingCode(response.data.pairingCode || null);
        setShowQrModal(true);
      }

      await fetchInstancias();
    } catch (error: any) {
      console.error("Error connecting instancia:", error);
      toast.error(error.message || "Erro ao conectar instância");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (instancia: OmniInstancia) => {
    setActionLoading(instancia.id);

    try {
      const response = await supabase.functions.invoke("evolution-disconnect-instance", {
        body: { instancia_id: instancia.id },
      });

      if (response.error) throw response.error;

      toast.success("Instância desconectada");
      await fetchInstancias();
    } catch (error: any) {
      console.error("Error disconnecting instancia:", error);
      toast.error(error.message || "Erro ao desconectar instância");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckStatus = async (instancia: OmniInstancia) => {
    setActionLoading(instancia.id);

    try {
      const response = await supabase.functions.invoke("evolution-connection-status", {
        body: { instancia_id: instancia.id },
      });

      if (response.error) throw response.error;

      toast.success(`Status: ${response.data?.status || "verificado"}`);
      await fetchInstancias();
    } catch (error: any) {
      console.error("Error checking status:", error);
      toast.error(error.message || "Erro ao verificar status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedInstancia) return;

    setActionLoading(selectedInstancia.id);

    try {
      const response = await supabase.functions.invoke("evolution-delete-instance", {
        body: { instancia_id: selectedInstancia.id },
      });

      if (response.error) throw response.error;

      toast.success("Instância excluída com sucesso");
      setShowDeleteDialog(false);
      setSelectedInstancia(null);
      await fetchInstancias();
    } catch (error: any) {
      console.error("Error deleting instancia:", error);
      toast.error(error.message || "Erro ao excluir instância");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Conectado</Badge>;
      case "connecting":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Conectando...</Badge>;
      default:
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Desconectado</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <OmniHeader />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OmniHeader />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas conexões com o WhatsApp</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Instância
        </Button>
      </div>

      {instancias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <WifiOff className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma instância configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie uma instância para começar a receber mensagens do WhatsApp
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Instância
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instancias.map((instancia) => (
            <Card key={instancia.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{instancia.nome}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {instancia.evolution_instance_name}
                    </p>
                  </div>
                  {getStatusBadge(instancia.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {instancia.numero_whatsapp && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{instancia.numero_whatsapp}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {instancia.status === "connected" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckStatus(instancia)}
                        disabled={actionLoading === instancia.id}
                      >
                        {actionLoading === instancia.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(instancia)}
                        disabled={actionLoading === instancia.id}
                        className="text-destructive hover:text-destructive"
                      >
                        <WifiOff className="w-4 h-4 mr-1" />
                        Desconectar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(instancia)}
                      disabled={actionLoading === instancia.id}
                    >
                      {actionLoading === instancia.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-1" />
                      )}
                      Conectar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedInstancia(instancia);
                      setShowDeleteDialog(true);
                    }}
                    disabled={actionLoading === instancia.id}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>
              Crie uma nova instância para conectar um número de WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da instância</Label>
              <Input
                id="nome"
                placeholder="Ex: Atendimento Principal"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInstancia} disabled={actionLoading === "create"}>
              {actionLoading === "create" && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar Instância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp para conectar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {qrCode ? (
              <>
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                {pairingCode && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Código de pareamento:</p>
                    <code className="text-lg font-mono font-bold tracking-wider">{pairingCode}</code>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                if (selectedInstancia) {
                  await handleConnect(selectedInstancia);
                }
              }}
              disabled={actionLoading !== null}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar QR Code
            </Button>
            <Button onClick={() => setShowQrModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A instância "{selectedInstancia?.nome}" será
              permanentemente excluída e a conexão com o WhatsApp será perdida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === selectedInstancia?.id && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

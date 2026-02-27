import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Settings,
  Wifi,
  WifiOff,
  QrCode,
  Trash2,
  Edit,
  Loader2,
  RefreshCw,
  Phone,
  Calendar,
  Bot,
} from "lucide-react";
import { useOmniFilas, OmniFila } from "@/hooks/useOmniFilas";
import { OmniLayout } from "@/components/clinica/omnichannel/OmniLayout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSyncProgress } from "@/hooks/useSyncProgress";
import { Progress } from "@/components/ui/progress";

interface ClinicaContext {
  clinicaData: { id: string; nome_fantasia: string } | null;
  currentUser: { id: string; nome: string } | null;
}

const CORES_FILA = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export default function OmniFilas() {
  const { clinicaData } = useOutletContext<ClinicaContext>();
  const clinicaId = clinicaData?.id || null;

  const {
    filas,
    instancias,
    loading,
    createFila,
    updateFila,
    deleteFila,
    createInstancia,
    connectInstancia,
    disconnectInstancia,
    deleteInstancia,
    checkConnectionStatus,
  } = useOmniFilas(clinicaId);

  const [showNovaFila, setShowNovaFila] = useState(false);
  const [showNovaInstancia, setShowNovaInstancia] = useState(false);
  const [editingFila, setEditingFila] = useState<OmniFila | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ instanciaId: string; qrcode: string } | null>(null);
  const [syncHistoryDays, setSyncHistoryDays] = useState<number>(0);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [creatingInstancia, setCreatingInstancia] = useState(false);
  const [deletingInstanciaId, setDeletingInstanciaId] = useState<string | null>(null);

  const handleDeleteInstancia = async (instanciaId: string) => {
    setDeletingInstanciaId(instanciaId);
    await deleteInstancia(instanciaId);
    setDeletingInstanciaId(null);
  };

  const [checkingConnection, setCheckingConnection] = useState(false);

  // Sync progress polling
  const instanciaIds = instancias.map((i: any) => i.id);
  const syncProgressMap = useSyncProgress(instanciaIds);

  // Auto-check connection status when QR modal is open
  useEffect(() => {
    if (!qrCodeData?.instanciaId) return;

    const checkConnection = async () => {
      setCheckingConnection(true);
      try {
        const { data, error } = await supabase.functions.invoke("evolution-connection-status", {
          body: { instancia_id: qrCodeData.instanciaId },
        });

        if (!error && (data?.status === "connected" || data?.evolution_state === "open")) {
          toast.success("WhatsApp conectado com sucesso!");
          setQrCodeData(null);
          // Refresh instances
          await checkConnectionStatus(qrCodeData.instanciaId);
        }
      } catch (err) {
        console.error("Error checking connection:", err);
      } finally {
        setCheckingConnection(false);
      }
    };

    // Check immediately and then every 3 seconds
    checkConnection();
    const interval = setInterval(checkConnection, 3000);

    return () => clearInterval(interval);
  }, [qrCodeData?.instanciaId, checkConnectionStatus]);

  const [novaFilaData, setNovaFilaData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
    instancia_id: "",
    mensagem_boas_vindas: "",
    mensagem_fora_horario: "",
    mensagem_fechamento: "",
    atendimentos_max_agente: 5,
    estrategia_distribuicao: "round_robin",
    horario_inicio: "08:00",
    horario_fim: "18:00",
    dias_semana: [1, 2, 3, 4, 5],
  });

  const [novaInstanciaNome, setNovaInstanciaNome] = useState("");

  const handleCreateFila = async () => {
    if (!novaFilaData.nome) {
      toast.error("Nome da fila é obrigatório");
      return;
    }

    await createFila({
      nome: novaFilaData.nome,
      descricao: novaFilaData.descricao,
      cor: novaFilaData.cor,
      instancia_id: novaFilaData.instancia_id || null,
      mensagem_boas_vindas: novaFilaData.mensagem_boas_vindas,
      mensagem_fora_horario: novaFilaData.mensagem_fora_horario,
      mensagem_fechamento: novaFilaData.mensagem_fechamento,
      atendimentos_max_agente: novaFilaData.atendimentos_max_agente,
      estrategia_distribuicao: novaFilaData.estrategia_distribuicao,
      horario_funcionamento: {
        inicio: novaFilaData.horario_inicio,
        fim: novaFilaData.horario_fim,
        dias_semana: novaFilaData.dias_semana,
      },
    });

    setShowNovaFila(false);
    setNovaFilaData({
      nome: "",
      descricao: "",
      cor: "#3b82f6",
      instancia_id: "",
      mensagem_boas_vindas: "",
      mensagem_fora_horario: "",
      mensagem_fechamento: "",
      atendimentos_max_agente: 5,
      estrategia_distribuicao: "round_robin",
      horario_inicio: "08:00",
      horario_fim: "18:00",
      dias_semana: [1, 2, 3, 4, 5],
    });
  };

  const handleCreateInstancia = async () => {
    if (!novaInstanciaNome) {
      toast.error("Nome da instância é obrigatório");
      return;
    }

    setCreatingInstancia(true);
    const result = await createInstancia(novaInstanciaNome);
    setCreatingInstancia(false);

    if (result) {
      setShowNovaInstancia(false);
      setNovaInstanciaNome("");
    }
  };

  const handleConnect = async (instanciaId: string) => {
    setConnectingId(instanciaId);
    const result = await connectInstancia(instanciaId, syncHistoryDays || undefined);
    setConnectingId(null);

    if (result?.qrcode) {
      setQrCodeData({ instanciaId, qrcode: result.qrcode });
    }
  };

  const handleCheckStatus = async (instanciaId: string) => {
    await checkConnectionStatus(instanciaId);
    setQrCodeData(null);
  };

  if (loading) {
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
          <h1 className="text-xl sm:text-2xl font-bold">Filas de Atendimento</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie suas filas e conexões WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNovaInstancia} onOpenChange={setShowNovaInstancia}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Instância WhatsApp</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nome da Instância</Label>
                  <Input
                    value={novaInstanciaNome}
                    onChange={(e) => setNovaInstanciaNome(e.target.value)}
                    placeholder="Ex: Atendimento Geral"
                  />
                </div>
                <Button
                  onClick={handleCreateInstancia}
                  disabled={creatingInstancia}
                  className="w-full"
                >
                  {creatingInstancia && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Instância
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showNovaFila} onOpenChange={setShowNovaFila}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Fila
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Fila de Atendimento</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="geral" className="pt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
                  <TabsTrigger value="horario">Horário</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-4 pt-4">
                  <div>
                    <Label>Nome da Fila *</Label>
                    <Input
                      value={novaFilaData.nome}
                      onChange={(e) =>
                        setNovaFilaData({ ...novaFilaData, nome: e.target.value })
                      }
                      placeholder="Ex: Agendamentos"
                    />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={novaFilaData.descricao}
                      onChange={(e) =>
                        setNovaFilaData({ ...novaFilaData, descricao: e.target.value })
                      }
                      placeholder="Descrição da fila"
                    />
                  </div>

                  <div>
                    <Label>Cor</Label>
                    <div className="flex gap-2 mt-2">
                      {CORES_FILA.map((cor) => (
                        <button
                          key={cor}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            novaFilaData.cor === cor
                              ? "border-foreground"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: cor }}
                          onClick={() => setNovaFilaData({ ...novaFilaData, cor })}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Instância WhatsApp</Label>
                    <Select
                      value={novaFilaData.instancia_id || "none"}
                      onValueChange={(v) =>
                        setNovaFilaData({ ...novaFilaData, instancia_id: v === "none" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {instancias.map((inst) => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.nome}{" "}
                            {inst.status === "connected" && (
                              <span className="text-green-600">(Conectada)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estratégia de Distribuição</Label>
                    <Select
                      value={novaFilaData.estrategia_distribuicao}
                      onValueChange={(v) =>
                        setNovaFilaData({ ...novaFilaData, estrategia_distribuicao: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="menos_ocupado">Menos Ocupado</SelectItem>
                        <SelectItem value="aleatorio">Aleatório</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Máx. Atendimentos por Agente</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={novaFilaData.atendimentos_max_agente}
                      onChange={(e) =>
                        setNovaFilaData({
                          ...novaFilaData,
                          atendimentos_max_agente: parseInt(e.target.value) || 5,
                        })
                      }
                    />
                  </div>
                </TabsContent>

                <TabsContent value="mensagens" className="space-y-4 pt-4">
                  <div>
                    <Label>Mensagem de Boas-vindas</Label>
                    <Textarea
                      value={novaFilaData.mensagem_boas_vindas}
                      onChange={(e) =>
                        setNovaFilaData({
                          ...novaFilaData,
                          mensagem_boas_vindas: e.target.value,
                        })
                      }
                      placeholder="Olá! Seja bem-vindo ao nosso atendimento..."
                    />
                  </div>

                  <div>
                    <Label>Mensagem Fora do Horário</Label>
                    <Textarea
                      value={novaFilaData.mensagem_fora_horario}
                      onChange={(e) =>
                        setNovaFilaData({
                          ...novaFilaData,
                          mensagem_fora_horario: e.target.value,
                        })
                      }
                      placeholder="Nosso horário de atendimento é..."
                    />
                  </div>

                  <div>
                    <Label>Mensagem de Fechamento</Label>
                    <Textarea
                      value={novaFilaData.mensagem_fechamento}
                      onChange={(e) =>
                        setNovaFilaData({
                          ...novaFilaData,
                          mensagem_fechamento: e.target.value,
                        })
                      }
                      placeholder="Obrigado pelo contato! Atendimento encerrado."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="horario" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Horário Início</Label>
                      <Input
                        type="time"
                        value={novaFilaData.horario_inicio}
                        onChange={(e) =>
                          setNovaFilaData({
                            ...novaFilaData,
                            horario_inicio: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Horário Fim</Label>
                      <Input
                        type="time"
                        value={novaFilaData.horario_fim}
                        onChange={(e) =>
                          setNovaFilaData({
                            ...novaFilaData,
                            horario_fim: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Dias da Semana</Label>
                    <div className="flex gap-2 mt-2">
                      {["D", "S", "T", "Q", "Q", "S", "S"].map((dia, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`w-10 h-10 rounded-full border ${
                            novaFilaData.dias_semana.includes(idx)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                          onClick={() => {
                            const dias = novaFilaData.dias_semana.includes(idx)
                              ? novaFilaData.dias_semana.filter((d) => d !== idx)
                              : [...novaFilaData.dias_semana, idx];
                            setNovaFilaData({ ...novaFilaData, dias_semana: dias });
                          }}
                        >
                          {dia}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowNovaFila(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateFila}>Criar Fila</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* QR Code Modal */}
      <Dialog open={!!qrCodeData} onOpenChange={() => setQrCodeData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeData?.qrcode && (
              <img
                src={
                  qrCodeData.qrcode.startsWith("data:")
                    ? qrCodeData.qrcode
                    : `data:image/png;base64,${qrCodeData.qrcode}`
                }
                alt="QR Code"
                className="w-64 h-64"
              />
            )}
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no seu celular e escaneie o código acima
            </p>
            {syncHistoryDays > 0 && (
              <div className="flex items-center gap-2 text-xs bg-muted px-3 py-2 rounded-md">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>
                  Importando histórico dos últimos{" "}
                  {syncHistoryDays === 1 ? "24 horas" : `${syncHistoryDays} dias`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {checkingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando conexão automaticamente...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Aguardando escaneamento...</span>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instâncias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instâncias WhatsApp</CardTitle>
        </CardHeader>
        <CardContent>
          {instancias.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma instância configurada. Crie uma nova instância para começar.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {instancias.map((instancia) => (
                <Card key={instancia.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {instancia.status === "connected" ? (
                          <Wifi className="h-5 w-5 text-green-500" />
                        ) : instancia.status === "connecting" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                        ) : (
                          <WifiOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="font-medium">{instancia.nome}</span>
                      </div>
                      <Badge
                        variant={
                          instancia.status === "connected"
                            ? "default"
                            : instancia.status === "connecting"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {instancia.status === "connected"
                          ? "Conectada"
                          : instancia.status === "connecting"
                          ? "Conectando..."
                          : "Desconectada"}
                      </Badge>
                    </div>

                    {instancia.numero_whatsapp && (
                      <p className="text-sm text-muted-foreground mb-3">
                        📱 {instancia.numero_whatsapp}
                      </p>
                    )}

                    {/* Sync progress indicator */}
                    {(() => {
                      const sp = syncProgressMap[instancia.id];
                      const job = sp?.job;
                      if (!job || job.status === "done" && !job.last_error) return null;
                      const isActive = job.status === "queued" || job.status === "running";
                      const chatsTotal = job.progress_chats_total || 0;
                      const chatsDone = job.progress_chats_done || 0;
                      const msgsDone = job.progress_messages_done || 0;
                      const pct = chatsTotal > 0 ? Math.round((chatsDone / chatsTotal) * 100) : 0;
                      return (
                        <div className="mb-3 space-y-1">
                          {isActive && <Progress value={pct} className="h-1.5" />}
                          <p className="text-xs text-muted-foreground">
                            {isActive ? (
                              <>
                                <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                                Sincronizando histórico: {chatsDone}/{chatsTotal} conversas • {msgsDone} mensagens
                              </>
                            ) : job.status === "error" ? (
                              <span className="text-destructive">Erro na sincronização: {job.last_error}</span>
                            ) : job.status === "done" && job.last_error ? (
                              <span className="text-destructive">Sincronização finalizada com erro: {job.last_error}</span>
                            ) : null}
                          </p>
                        </div>
                      );
                    })()}

                    {instancia.status !== "connected" && (
                      <div className="mb-3">
                        <Label className="text-xs text-muted-foreground">Importar histórico</Label>
                        <Select
                          value={String(syncHistoryDays)}
                          onValueChange={(v) => setSyncHistoryDays(Number(v))}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Sem histórico" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Não importar</SelectItem>
                            <SelectItem value="1">Últimas 24 horas</SelectItem>
                            <SelectItem value="3">Últimas 72 horas</SelectItem>
                            <SelectItem value="7">Últimos 7 dias</SelectItem>
                            <SelectItem value="15">Últimos 15 dias</SelectItem>
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {instancia.status === "connected" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectInstancia(instancia.id)}
                          className="flex-1"
                        >
                          Desconectar
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleConnect(instancia.id)}
                          disabled={connectingId === instancia.id}
                          className="flex-1"
                        >
                          {connectingId === instancia.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <QrCode className="h-4 w-4 mr-1" />
                              Conectar
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCheckStatus(instancia.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingInstanciaId === instancia.id}
                          >
                            {deletingInstanciaId === instancia.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir instância</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a instância "{instancia.nome}"?
                              Esta ação irá desconectar o WhatsApp e excluir a instância permanentemente.
                              As filas vinculadas serão desvinculadas automaticamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteInstancia(instancia.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filas Configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {filas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma fila configurada. Crie uma nova fila para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {filas.map((fila) => (
                <div
                  key={fila.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: fila.cor }}
                    />
                    <div>
                      <p className="font-medium">{fila.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {fila.descricao || "Sem descrição"} •{" "}
                        {fila.instancia ? (
                          fila.instancia.status === "connected" ? (
                            <span className="text-green-600">
                              {fila.instancia.nome} (Conectada)
                            </span>
                          ) : (
                            <span>{fila.instancia.nome} (Desconectada)</span>
                          )
                        ) : (
                          "Sem instância"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={fila.ativo ? "default" : "secondary"}>
                      {fila.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-primary text-primary hover:bg-primary/10"
                      onClick={() => setEditingFila(fila)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir fila</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a fila "{fila.nome}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteFila(fila.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição de Fila */}
      <Dialog open={!!editingFila} onOpenChange={(open) => !open && setEditingFila(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Fila: {editingFila?.nome}</DialogTitle>
          </DialogHeader>
          {editingFila && (
            <EditarFilaForm
              fila={editingFila}
              instancias={instancias}
              onSave={async (data) => {
                await updateFila(editingFila.id, data);
                setEditingFila(null);
              }}
              onCancel={() => setEditingFila(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      </div>
    </OmniLayout>
  );
}

// Componente de formulário de edição
function EditarFilaForm({
  fila,
  instancias,
  onSave,
  onCancel,
}: {
  fila: OmniFila;
  instancias: any[];
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
  const horario = fila.horario_funcionamento as any || {};
  
  const [formData, setFormData] = useState({
    nome: fila.nome,
    descricao: fila.descricao || "",
    cor: fila.cor,
    instancia_id: fila.instancia_id || "",
    mensagem_boas_vindas: fila.mensagem_boas_vindas || "",
    mensagem_fora_horario: fila.mensagem_fora_horario || "",
    mensagem_fechamento: fila.mensagem_fechamento || "",
    atendimentos_max_agente: fila.atendimentos_max_agente || 5,
    estrategia_distribuicao: fila.estrategia_distribuicao || "round_robin",
    horario_inicio: horario.inicio || "08:00",
    horario_fim: horario.fim || "18:00",
    dias_semana: horario.dias_semana || [1, 2, 3, 4, 5],
    ativo: fila.ativo,
  });

  const [saving, setSaving] = useState(false);

  const CORES_FILA = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  ];

  const handleSubmit = async () => {
    setSaving(true);

    // Save fila data
    await onSave({
      nome: formData.nome,
      descricao: formData.descricao,
      cor: formData.cor,
      instancia_id: formData.instancia_id || null,
      mensagem_boas_vindas: formData.mensagem_boas_vindas,
      mensagem_fora_horario: formData.mensagem_fora_horario,
      mensagem_fechamento: formData.mensagem_fechamento,
      atendimentos_max_agente: formData.atendimentos_max_agente,
      estrategia_distribuicao: formData.estrategia_distribuicao,
      horario_funcionamento: {
        inicio: formData.horario_inicio,
        fim: formData.horario_fim,
        dias_semana: formData.dias_semana,
      },
      ativo: formData.ativo,
    });

    setSaving(false);
  };

  return (
    <Tabs defaultValue="geral" className="pt-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
        <TabsTrigger value="horario">Horário</TabsTrigger>
      </TabsList>

      <TabsContent value="geral" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <Label>Fila Ativa</Label>
          <Switch
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
          />
        </div>

        <div>
          <Label>Nome da Fila *</Label>
          <Input
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          />
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
          />
        </div>

        <div>
          <Label>Cor</Label>
          <div className="flex gap-2 mt-2">
            {CORES_FILA.map((cor) => (
              <button
                key={cor}
                type="button"
                className={`w-8 h-8 rounded-full border-2 ${
                  formData.cor === cor ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: cor }}
                onClick={() => setFormData({ ...formData, cor })}
              />
            ))}
          </div>
        </div>

        <div>
          <Label>Instância WhatsApp</Label>
          <Select
            value={formData.instancia_id || "none"}
            onValueChange={(v) => setFormData({ ...formData, instancia_id: v === "none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma instância" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {instancias.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.nome}{" "}
                  {inst.status === "connected" && (
                    <span className="text-green-600">(Conectada)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Estratégia de Distribuição</Label>
          <Select
            value={formData.estrategia_distribuicao}
            onValueChange={(v) => setFormData({ ...formData, estrategia_distribuicao: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round_robin">Round Robin</SelectItem>
              <SelectItem value="menos_ocupado">Menos Ocupado</SelectItem>
              <SelectItem value="aleatorio">Aleatório</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Máx. Atendimentos por Agente</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={formData.atendimentos_max_agente}
            onChange={(e) =>
              setFormData({
                ...formData,
                atendimentos_max_agente: parseInt(e.target.value) || 5,
              })
            }
          />
        </div>
      </TabsContent>

      <TabsContent value="mensagens" className="space-y-4 pt-4">
        <div>
          <Label>Mensagem de Boas-vindas</Label>
          <Textarea
            value={formData.mensagem_boas_vindas}
            onChange={(e) => setFormData({ ...formData, mensagem_boas_vindas: e.target.value })}
          />
        </div>

        <div>
          <Label>Mensagem Fora do Horário</Label>
          <Textarea
            value={formData.mensagem_fora_horario}
            onChange={(e) => setFormData({ ...formData, mensagem_fora_horario: e.target.value })}
          />
        </div>

        <div>
          <Label>Mensagem de Fechamento</Label>
          <Textarea
            value={formData.mensagem_fechamento}
            onChange={(e) => setFormData({ ...formData, mensagem_fechamento: e.target.value })}
          />
        </div>
      </TabsContent>

      <TabsContent value="horario" className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Horário Início</Label>
            <Input
              type="time"
              value={formData.horario_inicio}
              onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
            />
          </div>
          <div>
            <Label>Horário Fim</Label>
            <Input
              type="time"
              value={formData.horario_fim}
              onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Dias da Semana</Label>
          <div className="flex gap-2 mt-2">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((dia, idx) => (
              <button
                key={idx}
                type="button"
                className={`w-10 h-10 rounded-full border ${
                  formData.dias_semana.includes(idx)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                onClick={() => {
                  const dias = formData.dias_semana.includes(idx)
                    ? formData.dias_semana.filter((d) => d !== idx)
                    : [...formData.dias_semana, idx];
                  setFormData({ ...formData, dias_semana: dias });
                }}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>
      </TabsContent>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </Tabs>
  );
}

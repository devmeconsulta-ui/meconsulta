import { useState } from "react";
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
} from "lucide-react";
import { useOmniFilas, OmniFila } from "@/hooks/useOmniFilas";
import { OmniHeader } from "@/components/clinica/omnichannel/OmniHeader";
import { toast } from "sonner";

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
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [creatingInstancia, setCreatingInstancia] = useState(false);
  const [deletingInstanciaId, setDeletingInstanciaId] = useState<string | null>(null);

  const handleDeleteInstancia = async (instanciaId: string) => {
    setDeletingInstanciaId(instanciaId);
    await deleteInstancia(instanciaId);
    setDeletingInstanciaId(null);
  };

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
    const result = await connectInstancia(instanciaId);
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
      <div className="-m-6 flex flex-col min-h-[calc(100vh-64px)]">
        <div className="sticky top-0 z-50">
          <OmniHeader />
        </div>
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="-m-6 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="sticky top-0 z-50">
        <OmniHeader />
      </div>

      <div className="px-6 pt-6 pb-6 space-y-6 flex-1 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Filas de Atendimento</h1>
          <p className="text-muted-foreground">
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
                      value={novaFilaData.instancia_id}
                      onValueChange={(v) =>
                        setNovaFilaData({ ...novaFilaData, instancia_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
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
            <Button
              variant="outline"
              onClick={() => qrCodeData && handleCheckStatus(qrCodeData.instanciaId)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Conexão
            </Button>
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
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingFila(fila)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFila(fila.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

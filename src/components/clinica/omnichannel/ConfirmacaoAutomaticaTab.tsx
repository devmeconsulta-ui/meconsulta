import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Save,
  Loader2,
  Clock,
  MessageSquare,
  Timer,
  CalendarCheck,
  Info,
} from "lucide-react";
import { useConfirmacaoAutomatica } from "@/hooks/useConfirmacaoAutomatica";
import { useConfirmacaoAgenda } from "@/hooks/useConfirmacaoAgenda";

const MENSAGEM_PADRAO = `Olá {{nome_paciente}}! 👋

Lembramos que você tem uma consulta agendada:

🩺 *Médico:* {{nome_medico}} ({{especialidade}})
📅 *Data:* {{data}} às {{horario}}
📍 *Local:* {{local}}

⏰ Por favor, chegue 15 minutos antes do horário.

Confirme sua presença clicando no link abaixo:
{{link_confirmacao}}

*MeConsulta*`;

const DIAS_SEMANA_LABELS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface Props {
  clinicaId: string | null;
}

export function ConfirmacaoAutomaticaTab({ clinicaId }: Props) {
  const { config, isLoading, saveConfig } = useConfirmacaoAutomatica(clinicaId);
  const { filas } = useConfirmacaoAgenda(clinicaId);

  const [ativo, setAtivo] = useState(false);
  const [filaId, setFilaId] = useState("");
  const [horasAntes, setHorasAntes] = useState("24");
  const [mensagem, setMensagem] = useState(MENSAGEM_PADRAO);
  const [intervalo, setIntervalo] = useState([4]);
  const [ordemChegada, setOrdemChegada] = useState(false);
  const [horarioEnvio, setHorarioEnvio] = useState("06:00");
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);

  // Carregar config existente
  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setFilaId(config.fila_id || "");
      setHorasAntes(String(config.horas_antes));
      setMensagem(config.mensagem_template || MENSAGEM_PADRAO);
      setIntervalo([config.intervalo_envio_segundos]);
      setOrdemChegada(config.incluir_ordem_chegada);
      setHorarioEnvio(config.horario_envio?.slice(0, 5) || "06:00");
      setDiasSemana(config.dias_semana || [1, 2, 3, 4, 5]);
    }
  }, [config]);

  const toggleDia = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleSave = () => {
    saveConfig.mutate({
      ativo,
      fila_id: filaId || null,
      horas_antes: Number(horasAntes),
      mensagem_template: mensagem,
      intervalo_envio_segundos: intervalo[0],
      incluir_ordem_chegada: ordemChegada,
      horario_envio: horarioEnvio + ":00",
      dias_semana: diasSemana,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Card principal de ativação */}
      <Card className={ativo ? "border-l-4 border-l-emerald-500" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ativo ? "bg-emerald-500/10" : "bg-muted"}`}>
                <Zap className={`w-5 h-5 ${ativo ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Envio Automático
                  {ativo && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Ativo</Badge>}
                </CardTitle>
                <CardDescription>
                  Envie confirmações automaticamente para consultas do dia seguinte
                </CardDescription>
              </div>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </CardHeader>

        {ativo && (
          <CardContent className="space-y-6 pt-0">
            {/* Info box */}
            <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                O sistema enviará confirmações automaticamente para todas as consultas do dia seguinte, 
                no horário configurado abaixo. Consultas que já possuem confirmação pendente ou confirmada serão ignoradas.
              </p>
            </div>

            {/* Fila de envio */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Fila de Envio (WhatsApp)
              </Label>
              <Select value={filaId} onValueChange={setFilaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fila" />
                </SelectTrigger>
                <SelectContent>
                  {filas.map((fila: any) => (
                    <SelectItem key={fila.id} value={fila.id}>
                      {fila.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filas.length === 0 && (
                <p className="text-xs text-destructive">
                  Nenhuma fila com WhatsApp conectado. Configure uma instância primeiro.
                </p>
              )}
            </div>

            {/* Horário e antecedência */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Horário do envio
                </Label>
                <Select value={horarioEnvio} onValueChange={setHorarioEnvio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">06:00</SelectItem>
                    <SelectItem value="07:00">07:00</SelectItem>
                    <SelectItem value="08:00">08:00</SelectItem>
                    <SelectItem value="09:00">09:00</SelectItem>
                    <SelectItem value="10:00">10:00</SelectItem>
                    <SelectItem value="12:00">12:00</SelectItem>
                    <SelectItem value="14:00">14:00</SelectItem>
                    <SelectItem value="18:00">18:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Antecedência
                </Label>
                <Select value={horasAntes} onValueChange={setHorasAntes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 horas antes</SelectItem>
                    <SelectItem value="24">24 horas antes (D-1)</SelectItem>
                    <SelectItem value="48">48 horas antes (D-2)</SelectItem>
                    <SelectItem value="72">72 horas antes (D-3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dias da semana */}
            <div className="space-y-2">
              <Label>Dias de envio</Label>
              <div className="flex gap-2 flex-wrap">
                {DIAS_SEMANA_LABELS.map((dia) => (
                  <Button
                    key={dia.value}
                    type="button"
                    size="sm"
                    variant={diasSemana.includes(dia.value) ? "default" : "outline"}
                    onClick={() => toggleDia(dia.value)}
                    className="w-12"
                  >
                    {dia.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione em quais dias o sistema deve enviar confirmações
              </p>
            </div>

            {/* Intervalo entre envios */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                Intervalo entre envios: {intervalo[0]}s
              </Label>
              <Slider
                value={intervalo}
                onValueChange={setIntervalo}
                min={2}
                max={15}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Tempo de espera entre cada mensagem (evita bloqueio)
              </p>
            </div>

            {/* Ordem de chegada */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-ordem"
                checked={ordemChegada}
                onCheckedChange={(v) => setOrdemChegada(!!v)}
              />
              <Label htmlFor="auto-ordem" className="text-sm cursor-pointer">
                Incluir aviso de ordem de chegada na mensagem
              </Label>
            </div>

            {/* Mensagem template */}
            <div className="space-y-2">
              <Label>Mensagem de confirmação</Label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={10}
                className="text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Variáveis: {"{{nome_paciente}}"}, {"{{nome_medico}}"}, {"{{especialidade}}"}, {"{{data}}"}, {"{{horario}}"}, {"{{local}}"}, {"{{link_confirmacao}}"}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Botão salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveConfig.isPending} className="gap-2">
          {saveConfig.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

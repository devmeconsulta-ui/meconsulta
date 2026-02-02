import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Zap, 
  Save, 
  Loader2, 
  MessageSquare,
  Clock,
  Bell,
  Star,
  CalendarCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Automacao {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  config: Record<string, unknown>;
}

const AUTOMACOES_DISPONIVEIS = [
  {
    id: "confirmacao_consulta",
    nome: "Confirmação de Consulta",
    descricao: "Envia mensagem pedindo confirmação X horas antes da consulta",
    icone: CalendarCheck,
    cor: "text-blue-500",
    bgCor: "bg-blue-500/10",
    configFields: [
      { key: "horas_antes", label: "Horas antes da consulta", type: "select", options: ["12", "24", "48", "72"] },
    ],
  },
  {
    id: "lembrete_consulta",
    nome: "Lembrete de Consulta",
    descricao: "Envia lembrete automático antes da consulta",
    icone: Bell,
    cor: "text-amber-500",
    bgCor: "bg-amber-500/10",
    configFields: [
      { key: "horas_antes", label: "Horas antes da consulta", type: "select", options: ["1", "2", "4", "12", "24"] },
    ],
  },
  {
    id: "notificacao_pagamento",
    nome: "Notificação de Pagamento Pendente",
    descricao: "Notifica pacientes com pagamentos pendentes",
    icone: Clock,
    cor: "text-orange-500",
    bgCor: "bg-orange-500/10",
    configFields: [
      { key: "dias_apos", label: "Dias após vencimento", type: "select", options: ["1", "3", "5", "7"] },
    ],
  },
  {
    id: "followup_consulta",
    nome: "Follow-up Pós-Consulta",
    descricao: "Envia mensagem de acompanhamento após a consulta",
    icone: MessageSquare,
    cor: "text-green-500",
    bgCor: "bg-green-500/10",
    configFields: [
      { key: "dias_apos", label: "Dias após a consulta", type: "select", options: ["1", "3", "7", "15", "30"] },
    ],
  },
  {
    id: "pesquisa_satisfacao",
    nome: "Pesquisa de Satisfação",
    descricao: "Envia pesquisa de satisfação após atendimento",
    icone: Star,
    cor: "text-purple-500",
    bgCor: "bg-purple-500/10",
    configFields: [
      { key: "horas_apos", label: "Horas após a consulta", type: "select", options: ["2", "6", "12", "24"] },
    ],
  },
];

export function IntegracoesAutomacoes() {
  const [saving, setSaving] = useState(false);
  const [automacoes, setAutomacoes] = useState<Record<string, { ativo: boolean; config: Record<string, string> }>>({
    confirmacao_consulta: { ativo: true, config: { horas_antes: "24" } },
    lembrete_consulta: { ativo: false, config: { horas_antes: "2" } },
    notificacao_pagamento: { ativo: false, config: { dias_apos: "3" } },
    followup_consulta: { ativo: false, config: { dias_apos: "7" } },
    pesquisa_satisfacao: { ativo: false, config: { horas_apos: "24" } },
  });

  function handleToggle(id: string, ativo: boolean) {
    setAutomacoes(prev => ({
      ...prev,
      [id]: { ...prev[id], ativo }
    }));
  }

  function handleConfigChange(id: string, key: string, value: string) {
    setAutomacoes(prev => ({
      ...prev,
      [id]: { 
        ...prev[id], 
        config: { ...prev[id].config, [key]: value }
      }
    }));
  }

  async function handleSave() {
    setSaving(true);
    
    // Simular salvamento (implementar lógica real depois)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success("Automações salvas com sucesso!");
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Automações do Sistema</CardTitle>
              <CardDescription>
                Configure ações automáticas baseadas em eventos do sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground">
              As automações utilizam o sistema de mensagens WhatsApp configurado na aba Webhooks. 
              Certifique-se de que os webhooks estejam configurados corretamente.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {AUTOMACOES_DISPONIVEIS.map((automacao) => {
          const Icone = automacao.icone;
          const estado = automacoes[automacao.id];
          
          return (
            <Card key={automacao.id} className={estado?.ativo ? "border-l-4 border-l-primary" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg ${automacao.bgCor} flex items-center justify-center`}>
                      <Icone className={`w-5 h-5 ${automacao.cor}`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{automacao.nome}</h3>
                        {estado?.ativo && (
                          <Badge variant="default" className="text-xs">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{automacao.descricao}</p>
                      
                      {estado?.ativo && automacao.configFields && (
                        <div className="mt-3 flex items-center gap-4">
                          {automacao.configFields.map((field) => (
                            <div key={field.key} className="flex items-center gap-2">
                              <Label className="text-sm whitespace-nowrap">{field.label}:</Label>
                              {field.type === "select" && field.options && (
                                <Select
                                  value={estado.config[field.key]}
                                  onValueChange={(value) => handleConfigChange(automacao.id, field.key, value)}
                                >
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {field.options.map((opt) => (
                                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Switch
                    checked={estado?.ativo || false}
                    onCheckedChange={(checked) => handleToggle(automacao.id, checked)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Automações
        </Button>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { CrmEtapa, useCrmClinica } from "@/hooks/useCrmClinica";
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
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";

interface CrmEtapaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapa: CrmEtapa | null;
  funilId: string | null;
}

const CORES_PREDEFINIDAS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#f97316", // orange
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#6366f1", // indigo
];

export default function CrmEtapaModal({
  open,
  onOpenChange,
  etapa,
  funilId,
}: CrmEtapaModalProps) {
  const { criarEtapa, atualizarEtapa, excluirEtapa } = useCrmClinica(null);
  
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#3b82f6");
  const [podeGanhar, setPodeGanhar] = useState(false);
  const [podeCriar, setPodeCriar] = useState(true);
  const [tempoEstagnacao, setTempoEstagnacao] = useState(0);
  const [probabilidadeGanho, setProbabilidadeGanho] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (etapa) {
      setNome(etapa.nome);
      setDescricao(etapa.descricao || "");
      setCor(etapa.cor);
      setPodeGanhar(etapa.pode_ganhar);
      setPodeCriar(etapa.pode_criar);
      setTempoEstagnacao(etapa.tempo_estagnacao_dias);
      setProbabilidadeGanho(etapa.probabilidade_ganho);
    } else {
      setNome("");
      setDescricao("");
      setCor("#3b82f6");
      setPodeGanhar(false);
      setPodeCriar(true);
      setTempoEstagnacao(0);
      setProbabilidadeGanho(0);
    }
    setConfirmDelete(false);
  }, [etapa, open]);

  const handleSave = () => {
    if (!nome.trim()) return;

    const dados = {
      nome,
      descricao,
      cor,
      pode_ganhar: podeGanhar,
      pode_criar: podeCriar,
      tempo_estagnacao_dias: tempoEstagnacao,
      probabilidade_ganho: probabilidadeGanho,
    };

    if (etapa) {
      atualizarEtapa.mutate({ id: etapa.id, ...dados });
    } else {
      criarEtapa.mutate(dados);
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (etapa && confirmDelete) {
      excluirEtapa.mutate(etapa.id);
      onOpenChange(false);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {etapa ? "Configurar Etapa" : "Nova Etapa"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome*</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Lead Qualificado"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ações a serem realizadas nesta etapa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tempoEstagnacao">Tempo p/ estagnação (dias)</Label>
              <Input
                id="tempoEstagnacao"
                type="number"
                min={0}
                value={tempoEstagnacao}
                onChange={(e) => setTempoEstagnacao(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="probabilidade">Probabilidade de ganho (%)</Label>
              <Input
                id="probabilidade"
                type="number"
                min={0}
                max={100}
                value={probabilidadeGanho}
                onChange={(e) => setProbabilidadeGanho(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor da etapa</Label>
            <div className="flex flex-wrap gap-2">
              {CORES_PREDEFINIDAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    cor === c ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <Input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="w-8 h-8 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="podeGanhar">Pode marcar como ganho</Label>
              <Switch
                id="podeGanhar"
                checked={podeGanhar}
                onCheckedChange={setPodeGanhar}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="podeCriar">Pode criar leads</Label>
              <Switch
                id="podeCriar"
                checked={podeCriar}
                onCheckedChange={setPodeCriar}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {etapa && (
            <div className="mr-auto">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={excluirEtapa.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {confirmDelete ? "Confirmar" : "Excluir"}
              </Button>
            </div>
          )}
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim() || criarEtapa.isPending || atualizarEtapa.isPending}
          >
            {etapa ? "Atualizar" : "Criar Etapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

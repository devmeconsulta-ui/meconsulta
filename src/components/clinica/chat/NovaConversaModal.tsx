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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, User, Hash, MessageSquare } from "lucide-react";

interface Participante {
  id: string;
  nome: string;
  tipo: "medico" | "funcionario" | "admin_clinica";
  foto_url?: string;
  papel?: string;
}

interface NovaConversaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  onCriarGrupo: (nome: string, descricao?: string) => Promise<any>;
  onCriarPrivada: (participante: { tipo: "medico" | "funcionario" | "admin_clinica"; id: string }) => Promise<any>;
}

export function NovaConversaModal({
  open,
  onOpenChange,
  clinicaId,
  onCriarGrupo,
  onCriarPrivada,
}: NovaConversaModalProps) {
  const [tab, setTab] = useState<"grupo" | "privado">("grupo");
  const [nomeGrupo, setNomeGrupo] = useState("");
  const [descricaoGrupo, setDescricaoGrupo] = useState("");
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(false);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    if (open) {
      fetchParticipantes();
    }
  }, [open, clinicaId]);

  const fetchParticipantes = async () => {
    setLoading(true);
    try {
      const lista: Participante[] = [];

      // Buscar admin da clínica
      const { data: clinica } = await supabase
        .from("clinicas")
        .select("usuario_id, usuarios(id, nome)")
        .eq("id", clinicaId)
        .maybeSingle();

      if (clinica?.usuarios) {
        lista.push({
          id: (clinica.usuarios as any).id,
          nome: (clinica.usuarios as any).nome,
          tipo: "admin_clinica",
          papel: "Administrador",
        });
      }

      // Buscar médicos da clínica
      const { data: medicosClinica } = await supabase
        .from("clinicas_medicos")
        .select("medicos(id, nome, foto_url, especialidade)")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      for (const mc of medicosClinica || []) {
        if (mc.medicos) {
          lista.push({
            id: (mc.medicos as any).id,
            nome: (mc.medicos as any).nome,
            tipo: "medico",
            foto_url: (mc.medicos as any).foto_url,
            papel: (mc.medicos as any).especialidade || "Médico",
          });
        }
      }

      // Buscar funcionários da clínica
      const { data: funcionarios } = await supabase
        .from("usuarios_clinica")
        .select("id, nome, papel")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true);

      for (const func of funcionarios || []) {
        lista.push({
          id: func.id,
          nome: func.nome,
          tipo: "funcionario",
          papel: func.papel || "Funcionário",
        });
      }

      setParticipantes(lista);
    } catch (error) {
      console.error("Erro ao buscar participantes:", error);
      toast.error("Erro ao carregar participantes");
    } finally {
      setLoading(false);
    }
  };

  const handleCriarGrupo = async () => {
    if (!nomeGrupo.trim()) {
      toast.error("Digite o nome do grupo");
      return;
    }

    setCriando(true);
    try {
      await onCriarGrupo(nomeGrupo.trim(), descricaoGrupo.trim() || undefined);
      toast.success("Grupo criado com sucesso!");
      onOpenChange(false);
      setNomeGrupo("");
      setDescricaoGrupo("");
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error("Erro ao criar grupo");
    } finally {
      setCriando(false);
    }
  };

  const handleIniciarPrivada = async (participante: Participante) => {
    setCriando(true);
    try {
      await onCriarPrivada({ tipo: participante.tipo, id: participante.id });
      toast.success("Conversa iniciada!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar conversa:", error);
      toast.error("Erro ao criar conversa");
    } finally {
      setCriando(false);
    }
  };

  const getPapelLabel = (papel?: string) => {
    const papeis: Record<string, string> = {
      secretaria: "Secretária",
      recepcao: "Recepção",
      financeiro: "Financeiro",
      supervisor: "Supervisor",
      admin: "Administrador",
    };
    return papeis[papel || ""] || papel || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "grupo" | "privado")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grupo" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Grupo
            </TabsTrigger>
            <TabsTrigger value="privado" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Privado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grupo" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome-grupo">Nome do Grupo *</Label>
              <Input
                id="nome-grupo"
                placeholder="Ex: Equipe Médica, Atendimento..."
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao-grupo">Descrição (opcional)</Label>
              <Textarea
                id="descricao-grupo"
                placeholder="Descreva o propósito do grupo..."
                value={descricaoGrupo}
                onChange={(e) => setDescricaoGrupo(e.target.value)}
                rows={2}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <Users className="h-4 w-4 inline mr-2" />
              Todos os médicos e funcionários da clínica serão adicionados automaticamente.
            </div>

            <Button
              onClick={handleCriarGrupo}
              disabled={criando || !nomeGrupo.trim()}
              className="w-full"
            >
              {criando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Grupo"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="privado" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione uma pessoa para iniciar uma conversa privada:
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {participantes.map((p) => (
                    <button
                      key={`${p.tipo}-${p.id}`}
                      onClick={() => handleIniciarPrivada(p)}
                      disabled={criando}
                      className="w-full p-3 rounded-lg border hover:bg-muted transition-colors flex items-center gap-3 text-left"
                    >
                      <Avatar>
                        <AvatarImage src={p.foto_url} />
                        <AvatarFallback>
                          {p.nome.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {p.tipo === "medico" ? `Dr(a). ${p.nome}` : p.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getPapelLabel(p.papel)}
                        </p>
                      </div>
                    </button>
                  ))}

                  {participantes.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum participante encontrado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

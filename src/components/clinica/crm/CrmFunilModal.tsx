import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCrmClinica } from "@/hooks/useCrmClinica";
import { supabase } from "@/integrations/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Users, Zap, Settings } from "lucide-react";

interface CrmFunilModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funilId: string | null;
  clinicaId: string | null;
}

interface Automacoes {
  criar_lead_agendamento: boolean;
  mover_lead_status_consulta: boolean;
  mover_lead_pagamento: boolean;
  notificar_responsavel: boolean;
  notificar_estagnacao: boolean;
}

const DEFAULT_AUTOMACOES: Automacoes = {
  criar_lead_agendamento: true,
  mover_lead_status_consulta: true,
  mover_lead_pagamento: true,
  notificar_responsavel: false,
  notificar_estagnacao: false,
};

export default function CrmFunilModal({
  open,
  onOpenChange,
  funilId,
  clinicaId,
}: CrmFunilModalProps) {
  const { funis, criarFunil, atualizarFunil, excluirFunil } = useCrmClinica(clinicaId);
  const funilAtual = funis.find(f => f.id === funilId);
  
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [usuariosPermitidos, setUsuariosPermitidos] = useState<string[]>([]);
  const [todosTemAcesso, setTodosTemAcesso] = useState(true);
  const [automacoes, setAutomacoes] = useState<Automacoes>(DEFAULT_AUTOMACOES);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Buscar usuários da clínica
  const { data: usuariosClinica = [] } = useQuery({
    queryKey: ["usuarios-clinica", clinicaId],
    queryFn: async () => {
      if (!clinicaId) return [];
      const { data, error } = await supabase
        .from("usuarios_clinica")
        .select("id, nome, papel")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!clinicaId && open,
  });

  useEffect(() => {
    if (funilAtual) {
      setNome(funilAtual.nome);
      setDescricao(funilAtual.descricao || "");
      
      // Parse usuarios_permitidos
      const usuarios = (funilAtual as any).usuarios_permitidos as string[] | null;
      if (usuarios && usuarios.length > 0) {
        setTodosTemAcesso(false);
        setUsuariosPermitidos(usuarios);
      } else {
        setTodosTemAcesso(true);
        setUsuariosPermitidos([]);
      }
      
      // Parse automacoes
      const automacoesData = (funilAtual as any).automacoes as Automacoes | null;
      setAutomacoes(automacoesData ? { ...DEFAULT_AUTOMACOES, ...automacoesData } : DEFAULT_AUTOMACOES);
    } else {
      setNome("");
      setDescricao("");
      setTodosTemAcesso(true);
      setUsuariosPermitidos([]);
      setAutomacoes(DEFAULT_AUTOMACOES);
    }
    setConfirmDelete(false);
  }, [funilAtual, open]);

  const handleSave = async () => {
    if (!nome.trim()) return;

    const dados = {
      nome,
      descricao,
      usuarios_permitidos: todosTemAcesso ? null : usuariosPermitidos,
      automacoes,
    };

    if (funilId) {
      // Atualizar via supabase diretamente para incluir novos campos
      const { error } = await supabase
        .from("crm_funis")
        .update({
          nome: dados.nome,
          descricao: dados.descricao || null,
          usuarios_permitidos: dados.usuarios_permitidos,
          automacoes: JSON.parse(JSON.stringify(dados.automacoes)),
        })
        .eq("id", funilId);
      
      if (!error) {
        atualizarFunil.mutate({ id: funilId, nome, descricao });
      }
    } else {
      criarFunil.mutate({ nome, descricao });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (funilId && confirmDelete) {
      excluirFunil.mutate(funilId);
      onOpenChange(false);
    } else {
      setConfirmDelete(true);
    }
  };

  const toggleUsuario = (usuarioId: string) => {
    setUsuariosPermitidos(prev => 
      prev.includes(usuarioId)
        ? prev.filter(id => id !== usuarioId)
        : [...prev, usuarioId]
    );
  };

  const updateAutomacao = (key: keyof Automacoes, value: boolean) => {
    setAutomacoes(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {funilId ? "Configurar Funil" : "Novo Funil"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="geral" className="text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="permissoes" className="text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="automacoes" className="text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Automações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome*</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Comercial, Atendimento..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o objetivo deste funil..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="permissoes" className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Todos têm acesso</Label>
                <p className="text-xs text-muted-foreground">
                  Todos os usuários da clínica podem ver este funil
                </p>
              </div>
              <Switch
                checked={todosTemAcesso}
                onCheckedChange={setTodosTemAcesso}
              />
            </div>

            {!todosTemAcesso && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Usuários com acesso</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {usuariosClinica.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum usuário encontrado
                    </p>
                  ) : (
                    usuariosClinica.map((usuario) => (
                      <div
                        key={usuario.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleUsuario(usuario.id)}
                      >
                        <Checkbox
                          checked={usuariosPermitidos.includes(usuario.id)}
                          onCheckedChange={() => toggleUsuario(usuario.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{usuario.nome}</p>
                          <p className="text-xs text-muted-foreground">{usuario.papel}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {usuariosPermitidos.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {usuariosPermitidos.length} usuário(s) selecionado(s)
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="automacoes" className="mt-4 space-y-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium">Criar lead ao agendar</Label>
                  <p className="text-xs text-muted-foreground">
                    Cria automaticamente um lead quando uma consulta é agendada online
                  </p>
                </div>
                <Switch
                  checked={automacoes.criar_lead_agendamento}
                  onCheckedChange={(v) => updateAutomacao("criar_lead_agendamento", v)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium">Mover lead por status</Label>
                  <p className="text-xs text-muted-foreground">
                    Move o lead automaticamente conforme o status da consulta muda
                  </p>
                </div>
                <Switch
                  checked={automacoes.mover_lead_status_consulta}
                  onCheckedChange={(v) => updateAutomacao("mover_lead_status_consulta", v)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium">Mover lead por pagamento</Label>
                  <p className="text-xs text-muted-foreground">
                    Move o lead quando o pagamento é confirmado
                  </p>
                </div>
                <Switch
                  checked={automacoes.mover_lead_pagamento}
                  onCheckedChange={(v) => updateAutomacao("mover_lead_pagamento", v)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium">Notificar responsável</Label>
                  <p className="text-xs text-muted-foreground">
                    Envia notificação ao responsável quando um lead é atribuído
                  </p>
                </div>
                <Switch
                  checked={automacoes.notificar_responsavel}
                  onCheckedChange={(v) => updateAutomacao("notificar_responsavel", v)}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-sm font-medium">Alerta de estagnação</Label>
                  <p className="text-xs text-muted-foreground">
                    Notifica quando um lead fica muito tempo na mesma etapa
                  </p>
                </div>
                <Switch
                  checked={automacoes.notificar_estagnacao}
                  onCheckedChange={(v) => updateAutomacao("notificar_estagnacao", v)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4">
          {funilId ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={excluirFunil.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {confirmDelete ? "Confirmar Exclusão" : "Excluir"}
              </Button>
              {confirmDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          ) : (
            <div />
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!nome.trim() || criarFunil.isPending || atualizarFunil.isPending}
            >
              {funilId ? "Atualizar" : "Criar Funil"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

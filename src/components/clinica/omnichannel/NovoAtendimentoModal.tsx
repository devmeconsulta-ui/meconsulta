import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, Phone, MessageCircle, Plus, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
}

interface Fila {
  id: string;
  nome: string;
  cor: string;
}

interface NovoAtendimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinicaId: string;
  onAtendimentoCriado: (atendimentoId: string) => void;
}

function getInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function NovoAtendimentoModal({
  open,
  onOpenChange,
  clinicaId,
  onAtendimentoCriado,
}: NovoAtendimentoModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [selectedFilaId, setSelectedFilaId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showNewContactForm, setShowNewContactForm] = useState(false);

  // Fetch filas on mount
  useEffect(() => {
    const fetchFilas = async () => {
      if (!clinicaId) return;
      
      const { data, error } = await supabase
        .from("omni_filas")
        .select("id, nome, cor")
        .eq("clinica_id", clinicaId)
        .eq("ativo", true)
        .order("nome");

      if (!error && data) {
        setFilas(data);
        // Auto-select first fila
        if (data.length > 0 && !selectedFilaId) {
          setSelectedFilaId(data[0].id);
        }
      }
    };

    if (open) {
      fetchFilas();
    }
  }, [clinicaId, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setNomeContato("");
      setShowNewContactForm(false);
    }
  }, [open]);

  // Fetch contatos when searching
  useEffect(() => {
    const fetchContatos = async () => {
      if (!clinicaId) return;
      
      setLoading(true);
      try {
        let query = supabase
          .from("omni_contatos")
          .select("id, nome, telefone, email")
          .eq("clinica_id", clinicaId)
          .order("nome");

        if (searchTerm.trim()) {
          const term = `%${searchTerm}%`;
          query = query.or(`nome.ilike.${term},telefone.ilike.${term}`);
        }

        query = query.limit(20);

        const { data, error } = await query;
        if (error) throw error;
        setContatos(data || []);
      } catch (error) {
        console.error("Error fetching contatos:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchContatos, 300);
    return () => clearTimeout(debounce);
  }, [clinicaId, searchTerm]);

  const criarAtendimento = async (contatoId: string) => {
    if (!selectedFilaId) {
      toast.error("Selecione uma fila de atendimento");
      return;
    }

    setCreating(true);
    try {
      // Check if there's already an active atendimento for this contact
      const { data: existingList } = await supabase
        .from("omni_atendimentos")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("contato_id", contatoId)
        .in("status", ["aguardando", "em_atendimento"]);

      if (existingList && existingList.length > 0) {
        toast.info("Já existe um atendimento ativo para este contato");
        onAtendimentoCriado(existingList[0].id);
        onOpenChange(false);
        setCreating(false);
        return;
      }

      // Create new atendimento with fila_id
      const { data: atendimento, error } = await supabase
        .from("omni_atendimentos")
        .insert({
          clinica_id: clinicaId,
          contato_id: contatoId,
          fila_id: selectedFilaId,
          canal: "whatsapp",
          status: "em_atendimento",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Atendimento criado!");
      onAtendimentoCriado(atendimento.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating atendimento:", error);
      toast.error("Erro ao criar atendimento");
    } finally {
      setCreating(false);
    }
  };

  const criarContatoEAtendimento = async () => {
    const telefone = searchTerm.replace(/\D/g, "");
    if (telefone.length < 10) {
      toast.error("Digite um telefone válido (mínimo 10 dígitos)");
      return;
    }

    if (!nomeContato.trim()) {
      toast.error("Digite o nome do contato");
      return;
    }

    if (!selectedFilaId) {
      toast.error("Selecione uma fila de atendimento");
      return;
    }

    setCreating(true);
    try {
      // Check if contact already exists with this phone
      const { data: existingList } = await supabase
        .from("omni_contatos")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("telefone", telefone);

      if (existingList && existingList.length > 0) {
        toast.info("Este telefone já está cadastrado");
        await criarAtendimento(existingList[0].id);
        return;
      }

      // Create new contact
      const { data: novoContato, error: contatoError } = await supabase
        .from("omni_contatos")
        .insert({
          clinica_id: clinicaId,
          telefone: telefone,
          nome: nomeContato.trim(),
        })
        .select()
        .single();

      if (contatoError) throw contatoError;

      // Create atendimento with fila_id
      const { data: atendimento, error: atendError } = await supabase
        .from("omni_atendimentos")
        .insert({
          clinica_id: clinicaId,
          contato_id: novoContato.id,
          fila_id: selectedFilaId,
          canal: "whatsapp",
          status: "em_atendimento",
        })
        .select()
        .single();

      if (atendError) throw atendError;

      toast.success("Contato e atendimento criados!");
      onAtendimentoCriado(atendimento.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating contact and atendimento:", error);
      toast.error("Erro ao criar atendimento");
    } finally {
      setCreating(false);
    }
  };

  // Check if search term looks like a phone number
  const digitsOnly = searchTerm.replace(/\D/g, "");
  const isPhoneLike = digitsOnly.length >= 8;
  const isValidPhone = digitsOnly.length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Novo Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fila selector */}
          <div className="space-y-2">
            <Label>Fila de Atendimento *</Label>
            <Select value={selectedFilaId} onValueChange={setSelectedFilaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fila..." />
              </SelectTrigger>
              <SelectContent>
                {filas.map((fila) => (
                  <SelectItem key={fila.id} value={fila.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: fila.cor }}
                      />
                      {fila.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filas.length === 0 && (
              <p className="text-xs text-destructive">
                Nenhuma fila ativa. Crie uma fila antes de iniciar atendimentos.
              </p>
            )}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato ou digitar telefone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowNewContactForm(false);
              }}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* New contact form */}
          {showNewContactForm && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do contato *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome"
                    placeholder="Digite o nome..."
                    value={nomeContato}
                    onChange={(e) => setNomeContato(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{formatPhone(searchTerm)}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewContactForm(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={criarContatoEAtendimento}
                  disabled={creating || !nomeContato.trim() || !isValidPhone}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Criar
                </Button>
              </div>
            </div>
          )}

          {/* Create new contact option - always show when searching */}
          {!showNewContactForm && searchTerm.trim() && (
            <Button
              variant="outline"
              className={`w-full justify-start gap-3 h-auto py-3 ${
                isValidPhone 
                  ? "border-primary bg-primary/5 hover:bg-primary/10" 
                  : "border-dashed border-muted-foreground/40"
              }`}
              onClick={() => {
                if (isValidPhone) {
                  setShowNewContactForm(true);
                } else {
                  toast.error("Digite um telefone válido (mínimo 10 dígitos, ex: 11999998888)");
                }
              }}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                isValidPhone ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <Plus className="h-5 w-5" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">
                  {isValidPhone ? "Iniciar atendimento com este número" : "Digite o telefone completo"}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {isPhoneLike ? formatPhone(searchTerm) : searchTerm}
                  {!isValidPhone && (
                    <span className="text-xs text-destructive ml-1">
                      ({10 - digitsOnly.length} dígitos restantes)
                    </span>
                  )}
                </span>
              </div>
            </Button>
          )}

          {/* Contact list */}
          {!showNewContactForm && (
            <ScrollArea className="h-[280px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : contatos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Phone className="h-8 w-8 mb-2" />
                  <p className="text-sm text-center px-4">
                    {searchTerm 
                      ? "Nenhum contato encontrado. Digite um telefone completo para criar novo." 
                      : "Digite para buscar contatos ou um telefone novo"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {contatos.map((contato) => (
                    <Button
                      key={contato.id}
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto py-2"
                      onClick={() => criarAtendimento(contato.id)}
                      disabled={creating}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(contato.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="font-medium truncate max-w-[200px]">
                          {contato.nome}
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {formatPhone(contato.telefone)}
                        </span>
                      </div>
                      {creating && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

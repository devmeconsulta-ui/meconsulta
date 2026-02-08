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
import { Search, Loader2, Phone, MessageCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
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
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

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

      // Create new atendimento
      const { data: atendimento, error } = await supabase
        .from("omni_atendimentos")
        .insert({
          clinica_id: clinicaId,
          contato_id: contatoId,
          canal: "whatsapp",
          status: "em_atendimento",
          origem: "manual",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Atendimento criado!");
      onAtendimentoCriado(atendimento.id);
      onOpenChange(false);
      setSearchTerm("");
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
      toast.error("Digite um telefone válido");
      return;
    }

    setCreating(true);
    try {
      // Check if contact already exists
      const { data: existingContato } = await supabase
        .from("omni_contatos")
        .select("id")
        .eq("clinica_id", clinicaId)
        .eq("telefone", telefone)
        .single();

      if (existingContato) {
        await criarAtendimento(existingContato.id);
        return;
      }

      // Create new contact
      const { data: novoContato, error: contatoError } = await supabase
        .from("omni_contatos")
        .insert({
          clinica_id: clinicaId,
          telefone: telefone,
          nome: telefone, // Use phone as name initially
        })
        .select()
        .single();

      if (contatoError) throw contatoError;

      // Create atendimento
      const { data: atendimento, error: atendError } = await supabase
        .from("omni_atendimentos")
        .insert({
          clinica_id: clinicaId,
          contato_id: novoContato.id,
          canal: "whatsapp",
          status: "em_atendimento",
          origem: "manual",
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

  // Show option to create from phone if user typed at least 8 digits
  const digitsOnly = searchTerm.replace(/\D/g, "");
  const hasEnoughDigits = digitsOnly.length >= 8;
  const isValidPhone = digitsOnly.length >= 10;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) setSearchTerm("");
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Novo Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato ou digitar telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Create from phone number - show earlier */}
          {hasEnoughDigits && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 border-primary/30 hover:border-primary hover:bg-primary/5"
              onClick={criarContatoEAtendimento}
              disabled={creating || !isValidPhone}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-medium">
                  {isValidPhone ? "Iniciar conversa com" : "Continue digitando..."}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone(searchTerm)}
                  {!isValidPhone && <span className="text-xs">(mín. 10 dígitos)</span>}
                </span>
              </div>
              {creating && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </Button>
          )}

          {/* Contact list */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contatos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Phone className="h-8 w-8 mb-2" />
                <p className="text-sm text-center">
                  {searchTerm 
                    ? "Nenhum contato encontrado. Digite o telefone completo para criar novo." 
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
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

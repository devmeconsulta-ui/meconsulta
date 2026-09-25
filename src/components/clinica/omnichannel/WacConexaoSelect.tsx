import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  clinicaId: string | null;
  value: string;
  onChange: (v: string) => void;
}

interface Conexao {
  id: string;
  nome: string;
  display_phone_number: string | null;
  verified_name: string | null;
}

export function WacConexaoSelect({ clinicaId, value, onChange }: Props) {
  const { currentUser } = useAuth();
  const [conexoes, setConexoes] = useState<Conexao[]>([]);

  useEffect(() => {
    if (!clinicaId || !currentUser?.id) return;
    supabase.functions
      .invoke("wac-admin", {
        body: { action: "list", usuario_id: currentUser.id, clinica_id: clinicaId },
      })
      .then(({ data, error }) => {
        if (error || !data?.ok) {
          console.error("Erro ao carregar conexões oficiais:", error || data?.message);
          return;
        }
        setConexoes(data.conexoes || []);
      });
  }, [clinicaId, currentUser?.id]);

  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um número oficial" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nenhum</SelectItem>
        {conexoes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome || c.verified_name || "Número oficial"}
            {c.display_phone_number ? ` · ${c.display_phone_number}` : ""} (Oficial)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
